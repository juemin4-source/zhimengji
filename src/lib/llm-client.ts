// ===== LLM Client — 织梦机 v1.3 =====
// Wraps Tauri invoke('call_llm', ...) with streaming and error handling.
// Falls back to local API call when Tauri backend is unavailable.

import type { Message, AiModel } from '../types/ai';

export interface LlmCallOptions {
  model: AiModel;
  endpoint?: string;
  apiKey?: string;
  timeout?: number;
  onToken?: (token: string) => void;
  signal?: AbortSignal;
}

export interface LlmResponse {
  content: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
}

export type LlmErrorCode = 'timeout' | 'auth_failed' | 'network_error' | 'rate_limited' | 'server_error' | 'unknown';

export class LlmError extends Error {
  code: LlmErrorCode;
  constructor(code: LlmErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'LlmError';
  }
}

const FREELLM_ENDPOINT = 'http://localhost:3001/v1';

// ===== Token counting =====
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function calculateCost(tokensIn: number, tokensOut: number, model: AiModel): number {
  return ((tokensIn + tokensOut) / 1000) * model.costPer1KTokens;
}

// ===== Non-streaming call =====
export async function callLlm(messages: Pick<Message, 'role' | 'content'>[], options: LlmCallOptions): Promise<LlmResponse> {
  const { model, apiKey, timeout = 30000, signal } = options;
  const endpoint = options.endpoint || FREELLM_ENDPOINT;
  const token = apiKey || '';

  try {
    // Try Tauri invoke first
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      try {
        const result: any = await invokeTauri('call_llm', {
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          model: model.name,
          endpoint,
          apiKey: token,
          timeout,
        });
        const tokensIn = result.tokensIn || estimateTokens(JSON.stringify(messages));
        const tokensOut = result.tokensOut || estimateTokens(result.content || '');
        return {
          content: result.content || '',
          model: result.model || model.name,
          tokensIn,
          tokensOut,
          cost: calculateCost(tokensIn, tokensOut, model),
        };
      } catch (e: any) {
        if (e.code === 'TAURI_NOT_FOUND') throw e;
        throw mapTauriError(e);
      }
    }

    // Fallback: direct API call for development
    const response = await fetch(${endpoint}/chat/completions, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': Bearer ,
      },
      body: JSON.stringify({
        model: model.name,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        max_tokens: 4096,
      }),
      signal,
    });

    if (!response.ok) {
      if (response.status === 401) throw new LlmError('auth_failed', 'API Key 认证失败');
      if (response.status === 429) throw new LlmError('rate_limited', '请求频率过高，请稍后重试');
      if (response.status >= 500) throw new LlmError('server_error', 服务端错误 ());
      throw new LlmError('unknown', 请求失败 ());
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const tokensIn = data.usage?.prompt_tokens || estimateTokens(JSON.stringify(messages));
    const tokensOut = data.usage?.completion_tokens || estimateTokens(content);

    return {
      content,
      model: data.model || model.name,
      tokensIn,
      tokensOut,
      cost: calculateCost(tokensIn, tokensOut, model),
    };
  } catch (e) {
    if (e instanceof LlmError) throw e;
    if ((e as Error).name === 'AbortError') throw new LlmError('timeout', '请求已取消');
    if ((e as TypeError).message?.includes('fetch')) throw new LlmError('network_error', '网络连接失败，请检查网络或端点 URL');
    throw new LlmError('unknown', (e as Error).message || '未知错误');
  }
}

// ===== Streaming call =====
export async function callLlmStream(
  messages: Pick<Message, 'role' | 'content'>[],
  options: LlmCallOptions
): Promise<LlmResponse> {
  const { model, apiKey, onToken, timeout = 30000, signal } = options;
  const endpoint = options.endpoint || FREELLM_ENDPOINT;
  const token = apiKey || '';

  let fullContent = '';
  let tokensOut = 0;

  try {
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      try {
        const result: any = await invokeTauri('call_llm_stream', {
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          model: model.name,
          endpoint,
          apiKey: token,
          timeout,
        });
        if (onToken && result.content) onToken(result.content);
        fullContent = result.content || '';
        tokensOut = result.tokensOut || estimateTokens(fullContent);
      } catch (e: any) {
        throw mapTauriError(e);
      }
    } else {
      const response = await fetch(${endpoint}/chat/completions, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': Bearer ,
        },
        body: JSON.stringify({
          model: model.name,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          max_tokens: 4096,
          stream: true,
        }),
        signal,
      });

      if (!response.ok) {
        if (response.status === 401) throw new LlmError('auth_failed', 'API Key 认证失败');
        if (response.status === 429) throw new LlmError('rate_limited', '请求频率过高');
        if (response.status >= 500) throw new LlmError('server_error', 服务端错误 ());
        throw new LlmError('unknown', 请求失败 ());
      }

      const reader = response.body?.getReader();
      if (!reader) throw new LlmError('network_error', '无法读取响应流');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const chunk = JSON.parse(data);
            const delta = chunk.choices?.[0]?.delta?.content || '';
            if (delta && onToken) onToken(delta);
            fullContent += delta;
          } catch { /* skip parse errors */ }
        }
      }
      tokensOut = estimateTokens(fullContent);
    }

    const tokensIn = estimateTokens(JSON.stringify(messages));
    return {
      content: fullContent,
      model: model.name,
      tokensIn,
      tokensOut,
      cost: calculateCost(tokensIn, tokensOut, model),
    };
  } catch (e) {
    if (e instanceof LlmError) throw e;
    if ((e as Error).name === 'AbortError') throw new LlmError('timeout', '请求已取消');
    throw new LlmError('unknown', (e as Error).message || '未知错误');
  }
}

// ===== Test connection =====
export async function testConnection(endpoint: string, apiKey: string): Promise<{ success: boolean; latency: number; models: string[]; error?: string }> {
  const start = performance.now();
  try {
    const response = await fetch(${endpoint}/models, {
      headers: { 'Authorization': Bearer  },
      signal: AbortSignal.timeout(10000),
    });
    const latency = Math.round(performance.now() - start);
    if (!response.ok) {
      return { success: false, latency, models: [], error: HTTP :  };
    }
    const data = await response.json();
    const models = (data.data || data.models || []).map((m: any) => m.id || m.name || m);
    return { success: true, latency, models };
  } catch (e: any) {
    const latency = Math.round(performance.now() - start);
    return { success: false, latency, models: [], error: e.message || '连接失败' };
  }
}

// ===== Tauri invoke helper =====
async function invokeTauri(cmd: string, args: Record<string, unknown>): Promise<any> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke(cmd, args);
}

function mapTauriError(e: any): LlmError {
  const msg = (e?.message || e?.toString() || '').toLowerCase();
  if (msg.includes('timeout') || msg.includes('timed out')) return new LlmError('timeout', '请求超时');
  if (msg.includes('auth') || msg.includes('401') || msg.includes('key')) return new LlmError('auth_failed', 'API Key 认证失败');
  if (msg.includes('network') || msg.includes('fetch')) return new LlmError('network_error', '网络连接失败');
  return new LlmError('unknown', e?.message || '未知错误');
}
