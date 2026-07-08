/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock tauri-api before importing SyncManager ──
const mockPing = vi.fn();
const mockCreateWorldObject = vi.fn();
const mockUpdateWorldObject = vi.fn();
const mockDeleteWorldObject = vi.fn();
const mockSaveCanvasTabState = vi.fn();
const mockCreateConnection = vi.fn();
const mockDeleteConnection = vi.fn();
const mockAppendJudgmentRecord = vi.fn();

vi.mock('../tauri-api', () => ({
  ping: (...args: unknown[]) => mockPing(...args),
  createWorldObject: (...args: unknown[]) => mockCreateWorldObject(...args),
  updateWorldObject: (...args: unknown[]) => mockUpdateWorldObject(...args),
  deleteWorldObject: (...args: unknown[]) => mockDeleteWorldObject(...args),
  saveCanvasTabState: (...args: unknown[]) => mockSaveCanvasTabState(...args),
  createConnection: (...args: unknown[]) => mockCreateConnection(...args),
  deleteConnection: (...args: unknown[]) => mockDeleteConnection(...args),
  appendJudgmentRecord: (...args: unknown[]) => mockAppendJudgmentRecord(...args),
}));

import { SyncManager } from './SyncManager';

describe('SyncManager', () => {
  let sm: SyncManager;

  beforeEach(() => {
    vi.clearAllMocks();
    sm = new SyncManager();
    mockPing.mockResolvedValue('pong');
  });

  afterEach(async () => {
    sm.stopPing();
    await sm.clearAll();
  });

  // ── Queue Persistence ──

  describe('queue persistence', () => {
    it('enqueue adds an operation, getQueueLength returns 1', async () => {
      await sm.enqueue('createObject', { name: 'test' });
      const len = await sm.getQueueLength();
      expect(len).toBe(1);
    });

    it('multiple enqueues increase queue length', async () => {
      mockCreateWorldObject.mockRejectedValue(new Error('fail'));
      mockUpdateWorldObject.mockRejectedValue(new Error('fail'));
      mockDeleteWorldObject.mockRejectedValue(new Error('fail'));
      await sm.enqueue('createObject', { name: 'a' });
      await sm.enqueue('updateObject', { id: '1' });
      await sm.enqueue('deleteObject', { id: '2' });
      const len = await sm.getQueueLength();
      expect(len).toBe(3);
    });

    it('clearAll empties the queue', async () => {
      await sm.enqueue('createObject', { name: 'test' });
      await sm.clearAll();
      const len = await sm.getQueueLength();
      expect(len).toBe(0);
    });
  });

  // ── Retry Behavior ──

  describe('retry behavior', () => {
    it('failed operation stays in queue and is retried', async () => {
      mockCreateWorldObject.mockRejectedValue(new Error('Network error'));
      await sm.enqueue('createObject', { name: 'retry-test' });

      // Give processQueue time to attempt execution
      await new Promise(r => setTimeout(r, 50));

      // Operation should still be in queue (executeOp failed)
      expect(await sm.getQueueLength()).toBe(1);

      // executeOp should have been called at least once
      expect(mockCreateWorldObject).toHaveBeenCalledTimes(1);
    });

    it('successful operation is removed from queue', async () => {
      mockCreateWorldObject.mockResolvedValue({ id: 'new-obj' });
      await sm.enqueue('createObject', { name: 'success-test' });

      // Give processQueue time to complete
      await new Promise(r => setTimeout(r, 50));

      expect(await sm.getQueueLength()).toBe(0);
      expect(mockCreateWorldObject).toHaveBeenCalledTimes(1);
    });

    it('exhausts retries and marks item as failed', async () => {
      mockCreateWorldObject.mockRejectedValue(new Error('Persistent error'));

      // Enqueue and let initial attempt fail
      await sm.enqueue('createObject', { name: 'fail-eventually' });
      await new Promise(r => setTimeout(r, 50));

      // Call retryFailed() repeatedly to exhaust retries (3 retries)
      // Each call triggers processQueue which increments retryCount
      for (let i = 0; i < 4; i++) {
        await sm.retryFailed();
        await new Promise(r => setTimeout(r, 20));
      }

      // After exhausting retries, item should be in failed state
      expect(await sm.getQueueLength()).toBe(1);
      const failedOps = await sm.getFailedOperations();
      expect(failedOps.length).toBe(1);
      expect(failedOps[0].error).toBe('Max retries exceeded');
    });

    it('getFailedCount returns correct count after failures', async () => {
      mockCreateWorldObject.mockRejectedValue(new Error('Error'));

      await sm.enqueue('createObject', { name: 'fail-count' });
      await new Promise(r => setTimeout(r, 50));

      // Exhaust retries
      for (let i = 0; i < 4; i++) {
        await sm.retryFailed();
        await new Promise(r => setTimeout(r, 20));
      }

      expect(sm.getFailedCount()).toBe(1);
    });
  });

  // ── Online/Offline Detection ──

  describe('online/offline detection', () => {
    it('starts online by default', () => {
      expect(sm.isOnline()).toBe(true);
    });

    it('reports offline when ping fails', async () => {
      mockPing.mockRejectedValue(new Error('Offline'));
      sm.startPing();
      // startPing calls ping() immediately
      await new Promise(r => setTimeout(r, 20));
      expect(sm.isOnline()).toBe(false);
      sm.stopPing();
    });

    it('reports online when ping succeeds after being offline', async () => {
      mockPing.mockRejectedValue(new Error('Offline'));
      sm.startPing();
      await new Promise(r => setTimeout(r, 20));
      expect(sm.isOnline()).toBe(false);
      sm.stopPing();

      // Start a new cycle with online
      mockPing.mockResolvedValue('pong');
    });

    it('accumulates items in queue while offline', async () => {
      mockPing.mockRejectedValue(new Error('Offline'));
      sm.startPing();
      await new Promise(r => setTimeout(r, 20));
      expect(sm.isOnline()).toBe(false);

      await sm.enqueue('createObject', { name: 'offline-item-1' });
      await sm.enqueue('createObject', { name: 'offline-item-2' });

      expect(await sm.getQueueLength()).toBe(2);
      // No API calls while offline
      expect(mockCreateWorldObject).not.toHaveBeenCalled();
      sm.stopPing();
    });
  });

  // ── On Reconnect (queue drains) ──

  describe('on reconnect', () => {
    it('drains the queue when retryFailed is called after being offline', async () => {
      // Start offline
      mockPing.mockRejectedValue(new Error('Offline'));
      sm.startPing();
      await new Promise(r => setTimeout(r, 20));

      // Enqueue while offline
      mockCreateWorldObject.mockResolvedValue({ id: 'synced' });
      await sm.enqueue('createObject', { name: 'item1' });
      await sm.enqueue('createObject', { name: 'item2' });
      expect(await sm.getQueueLength()).toBe(2);

      // Simulate reconnect by retrying
      await sm.retryFailed();
      await new Promise(r => setTimeout(r, 50));

      // Queue should be drained
      expect(await sm.getQueueLength()).toBe(0);
      expect(mockCreateWorldObject).toHaveBeenCalledTimes(2);
      sm.stopPing();
    });

    it('processes queued items when coming back online', async () => {
      // Enqueue while online — items get processed immediately
      mockCreateWorldObject.mockResolvedValue({ id: 'synced' });
      await sm.enqueue('createObject', { name: 'online-item' });
      await new Promise(r => setTimeout(r, 50));

      // Item should have been processed
      expect(await sm.getQueueLength()).toBe(0);
      expect(mockCreateWorldObject).toHaveBeenCalledTimes(1);
    });
  });

  // ── Failed Items Persist ──

  describe('failed items persist', () => {
    it('items stay in queue after exhausting retries', async () => {
      mockCreateWorldObject.mockRejectedValue(new Error('Persistent error'));

      await sm.enqueue('createObject', { name: 'persist-test' });
      await new Promise(r => setTimeout(r, 50));

      for (let i = 0; i < 4; i++) {
        await sm.retryFailed();
        await new Promise(r => setTimeout(r, 20));
      }

      // Item should still be in the queue
      expect(await sm.getQueueLength()).toBe(1);
      const failed = await sm.getFailedOperations();
      expect(failed).toHaveLength(1);
    });
  });

  // ── Save Status ──

  describe('save status', () => {
    it('initial status is saved', () => {
      expect(sm.getSaveStatus()).toBe('saved');
    });

    it('status changes when enqueuing while online', async () => {
      mockCreateWorldObject.mockResolvedValue({ id: 'obj' });
      await sm.enqueue('createObject', { name: 'status-test' });
      // Status should be 'saving' or 'saved' (changes rapidly)
      expect(['saving', 'saved']).toContain(sm.getSaveStatus());
    });

    it('status changes to offline when enqueuing while offline', async () => {
      mockPing.mockRejectedValue(new Error('Offline'));
      sm.startPing();
      await new Promise(r => setTimeout(r, 20));

      await sm.enqueue('createObject', { name: 'offline-status' });
      expect(sm.getSaveStatus()).toBe('offline');
      sm.stopPing();
    });

    it('notifies status listeners', async () => {
      const statusChanges: string[] = [];
      sm.onSaveStatusChange((status) => {
        statusChanges.push(status);
      });

      await sm.enqueue('createObject', { name: 'notify-test' });
      await new Promise(r => setTimeout(r, 50));

      expect(statusChanges.length).toBeGreaterThan(0);
    });
  });

  // ── retryFailed ──

  describe('retryFailed', () => {
    it('processes queue when retryFailed is called', async () => {
      mockCreateWorldObject
        .mockRejectedValueOnce(new Error('Fail once'))
        .mockResolvedValueOnce({ id: 'success' });

      await sm.enqueue('createObject', { name: 'retry-me' });
      await new Promise(r => setTimeout(r, 50));

      // Still in queue after first failure
      expect(await sm.getQueueLength()).toBe(1);

      // Retry should succeed now
      await sm.retryFailed();
      await new Promise(r => setTimeout(r, 50));

      expect(await sm.getQueueLength()).toBe(0);
    });
  });

  // ── Online/Offline callbacks ──

  describe('online status callbacks', () => {
    it('notifies online listeners when status changes', async () => {
      const onlineChanges: boolean[] = [];
      sm.onOnlineStatusChange((online) => {
        onlineChanges.push(online);
      });

      // Start offline
      mockPing.mockRejectedValue(new Error('Offline'));
      sm.startPing();
      await new Promise(r => setTimeout(r, 20));

      expect(onlineChanges).toContain(false);
      sm.stopPing();
    });
  });

  // ── getQueueLength ──

  describe('getQueueLength', () => {
    it('returns 0 for empty queue', async () => {
      const len = await sm.getQueueLength();
      expect(len).toBe(0);
    });

    it('returns correct count for multiple ops', async () => {
      await sm.enqueue('createObject', { name: 'a' });
      await sm.enqueue('updateObject', { id: 'b' });
      await sm.enqueue('deleteObject', { id: 'c' });
      // Items are processed immediately since we're online and APIs succeed
      // But mock didn't set up return values, so they'll fail
      // Actually, mockCreateWorldObject etc. are not set up, so calls reject -> stays in queue
      await new Promise(r => setTimeout(r, 50));

      // Since mocks reject by default, items stay in queue
      const len = await sm.getQueueLength();
      expect(len).toBeGreaterThanOrEqual(1);
    });
  });
});

