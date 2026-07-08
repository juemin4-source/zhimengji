/**
 * SyncManager — Offline-first sync for 织梦机 v1.2 (P2-04).
 *
 * Queue strategy with IndexedDB persistence, retry with exponential backoff,
 * and online/offline awareness.
 */

import type { SyncOperation, SyncOperationType, SaveStatus } from '../types/world';
import { invoke } from '@tauri-apps/api/core';

type StatusCallback = (status: SaveStatus) => void;
type OnlineCallback = (online: boolean) => void;

interface DBSchema {
  ops: SyncOperation;
}

const DB_NAME = 'zhimengji-sync';
const DB_VERSION = 1;
const STORE_NAME = 'ops';
const PING_INTERVAL_MS = 10000;
const BACKOFF_BASE_MS = 2000;

export class SyncManager {
  private db: IDBDatabase | null = null;
  private dbReady: Promise<void>;
  private _isOnline = navigator.onLine;
  private processing = false;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private retryTimers: ReturnType<typeof setTimeout>[] = [];
  private statusListeners: StatusCallback[] = [];
  private onlineListeners: OnlineCallback[] = [];
  private pendingCount = 0;
  private _failedCount = 0;
  private _saveStatus: SaveStatus = 'saved';

    constructor(
    private pingUrl: string = '',
    private pingTimeout: number = 3000,
  ) {
    this.dbReady = this.initDB();
    if (this.pingUrl) this.startPing();
  }

  // ═══ Public API ═══

  get isOnlineAccessor(): boolean {
    return this._isOnline;
  }

  isOnline(): boolean {
    return this._isOnline;
  }

  async clearAll(): Promise<void> {
    await this.dbReady;
    const tx = this.db!.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async retryFailed(): Promise<void> {
    await this.dbReady;
    this.processQueue();
  }

  async getFailedOperations(): Promise<SyncOperation[]> {
    await this.dbReady;
    const all = await this.getAllFromDB();
    return all.filter(o => o.retryCount > o.maxRetries);
  }

  getFailedCount(): number {
    return this._failedCount;
  }

  getSaveStatus(): SaveStatus {
    return this._saveStatus;
  }

  onSaveStatusChange(cb: StatusCallback): void {
    this.statusListeners.push(cb);
  }

  onOnlineStatusChange(cb: OnlineCallback): void {
    this.onlineListeners.push(cb);
  }

  private setSaveStatus(status: SaveStatus): void {
    this._saveStatus = status;
    this.statusListeners.forEach(cb => cb(status));
  }

  private setOnlineStatus(online: boolean): void {
    this._isOnline = online;
    this.onlineListeners.forEach(cb => cb(online));
    if (!online) {
      this.setSaveStatus('offline');
    } else {
      this.processQueue();
    }
  }

  async enqueue(type: SyncOperationType, payload: any): Promise<void> {
    await this.dbReady;
    const op: SyncOperation = {
      id: crypto.randomUUID(),
      type,
      payload,
      retryCount: 0,
      maxRetries: 5,
      createdAt: Date.now(),
    };
    await this.saveToDB(op);
    this.pendingCount = (await this.getAllFromDB()).length;

    if (!this._isOnline) {
      this.setSaveStatus('offline');
      return;
    }

    this.setSaveStatus('saving');
    this.processQueue();
  }

  async getQueueLength(): Promise<number> {
    await this.dbReady;
    const all = await this.getAllFromDB();
    return all.length;
  }

  startPing(): void {
    if (this.pingTimer) return;
    this.pingTimer = setInterval(() => this.ping(), PING_INTERVAL_MS);
    this.initialPing();
  }

  private initialPing(): void {
    try {
      invoke('ping');
    } catch {
      // ignore - may be in test environment
    }
  }

  stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    this.retryTimers.forEach(clearTimeout);
    this.retryTimers = [];
  }

  // ═══ Internal: DB ═══

  private initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => {
        this.db = req.result;
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  }

  private saveToDB(op: SyncOperation): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(op);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private removeFromDB(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private updateInDB(op: SyncOperation): Promise<void> {
    return this.saveToDB(op);
  }

  private getAllFromDB(): Promise<SyncOperation[]> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // ═══ Internal: Queue Processing ═══

  private async executeOp(op: SyncOperation): Promise<boolean> {
    try {
      const response = await fetch(this.pingUrl.replace('/ping', '/sync'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(op),
        signal: AbortSignal.timeout(this.pingTimeout),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async processQueue(): Promise<void> {
    if (this.processing || !this._isOnline) return;
    this.processing = true;

    try {
      const ops = await this.getAllFromDB();
      if (ops.length === 0) {
        this.setSaveStatus('saved');
        this.processing = false;
        return;
      }

      for (const op of ops) {
        if (op.retryCount > op.maxRetries) continue;

        const success = await this.executeOp(op);
        if (success) {
          await this.removeFromDB(op.id);
        } else {
          op.retryCount++;
          op.lastAttempt = Date.now();
          if (op.retryCount > op.maxRetries) {
            op.error = 'Max retries exceeded';
            await this.updateInDB(op);
            this._failedCount++;
            this.setSaveStatus('failed');
          } else {
            await this.updateInDB(op);
            // Schedule retry with exponential backoff
            const delay = BACKOFF_BASE_MS * Math.pow(2, op.retryCount - 1);
            const timer = setTimeout(() => this.processQueue(), delay);
            this.retryTimers.push(timer);
            this.processing = false;
            return;
          }
        }
      }

      // Check if any failed remain
      const remaining = await this.getAllFromDB();
      const hasFailed = remaining.some(o => o.retryCount > o.maxRetries);
      if (remaining.length === 0) {
        this.setSaveStatus('saved');
      } else if (!hasFailed) {
        this.setSaveStatus('saved');
      }
    } catch {
      // Queue processing error — keep status
    } finally {
      this.processing = false;
    }
  }

  // ═══ Internal: Ping ═══

  private async ping(): Promise<void> {
    try {
      const response = await fetch(this.pingUrl, {
        signal: AbortSignal.timeout(this.pingTimeout),
      });
      const wasOffline = !this._isOnline;
      this.setOnlineStatus(response.ok);
      if (wasOffline && this._isOnline) {
        this.processQueue();
      }
    } catch {
      this.setOnlineStatus(false);
    }
  }

  destroy(): void {
    this.stopPing();
    this.statusListeners = [];
    this.onlineListeners = [];
  }
}



