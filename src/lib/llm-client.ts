// ===== LLM Client — Zhimengji v2.0.2 (W03) =====
// Wraps Tauri invoke('call_llm', ...) with streaming and error handling.
// Falls back to local API call when Tauri backend is unavailable.
//
// v2.0.2 adds:
// - StructuredLlmCallOptions with outputSchema support
// - Provider-aware model routing (chat / structured / generation / detection)
// - Automatic output parsing when outputSchema is provided

import type { Message, AiModel } from '../types/ai';
import { parseStructuredOutput } from './ai/structured-parser';
import type { ParseResult } from './ai/structured-parser';

export interface LlmCallOptions {
  model: AiModel;
  endpoint?: string;
  apiKey?: string;
  timeout?: number;
  onToken?: (token: string) => void;
  signal?: AbortSignal;
}

/**
 * Extended options for structured LLM calls.
 * Adds schema hints, strict mode, and output-type routing.
 */
export interface StructuredLlmCallOptions extends LlmCallOptions {
  /** JSON schema for structured output (object, not stringified) */
  outputSchema?: Record<string, unknown>;
  /** If true, require exact schema match */
  strictMode?: boolean;
  /** Output type for provider-aware model routing */
  outputType?: 'discuss' | 'suggest' | 'write_preview' | 'detection' | 'chat' | 'structured' | 'generation';
}

export interface LlmResponse {
  content: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  /** Present when outputSchema was provided: the parsed result */
  parsed?: ParseResult;
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

/**
 * Provider-aware model routing.
 * Maps outputType to recommended model characteristics for model selection.
 */
function getModelRequirements(outputType?: string): { requiresStructured: boolean; priority: string } {
  switch (outputType) {
    case 'structured':
    case 'detection':
      return { requiresStructured: true, priority: 'accuracy' };
    case 'suggest':
    case 'write_preview':
    case 'generation':
      return { requiresStructured: false, priority: 'creativity' };
    case 'discuss':
    case 'chat':
    default:
      return { requiresStructured: false, priority: 'balance' };
  }
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function calculateCost(tokensIn: number, tokensOut: number, model: AiModel): number {
  return ((tokensIn + tokensOut) / 1000) * model.costPer1KTokens;
}
export async function callLlm(
  messages: Pick<Message, 'role' | 'content'>[],
  options: StructuredLlmCallOptions
): Promise<LlmResponse> {
  const { model, apiKey, timeout = 30000, signal, outputSchema, strictMode, outputType } = options;
  const endpoint = options.endpoint || FREELLM_ENDPOINT;
  const token = apiKey || '';

  // Provider-aware model routing hint (informational for now; actual model routing
  // is provider-specific and would be implemented in a model selector)
  const _modelReqs = getModelRequirements(outputType);

  try {
    // Try Tauri invoke first
    const hasTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
    if (hasTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const result: any = await invoke('call_llm', {
          provider: model.providerId,
          model: model.name,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          custom_endpoint: endpoint,
        });
        const tokensIn = result.tokensIn || estimateTokens(JSON.stringify(messages));
        const tokensOut = result.tokensOut || estimateTokens(result.content || '');
        let content = result.content || '';

        // Parse structured output if schema provided
        let parsed: ParseResult | undefined;
        if (outputSchema && content) {
          parsed = parseStructuredOutput({
            rawContent: content,
            schema: JSON.stringify(outputSchema),
            strict: strictMode ?? false,
          });
          // Use parsed data or fallback text as the content
          if (parsed.status === 'valid' || parsed.status === 'repaired') {
            content = JSON.stringify(parsed.data);
          } else if (parsed.status === 'fallback' && parsed.fallbackText) {
            content = parsed.fallbackText;
          }
          // On 'failed', keep original content but attach parsed info
        }

        return {
          content,
          model: result.model || model.name,
          tokensIn,
          tokensOut,
          cost: calculateCost(tokensIn, tokensOut, model),
          parsed,
        };
      } catch (e: any) {
        throw mapTauriError(e);
      }
    }

    // Fallback: direct API call
    const url = endpoint + '/chat/completions';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
      },
      body: JSON.stringify({
        model: model.name,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        max_tokens: 4096,
      }),
      signal: signal,
    });

    if (!response.ok) {
      if (response.status === 401) throw new LlmError('auth_failed', 'API Key ren zheng shi bai');
      if (response.status === 429) throw new LlmError('rate_limited', 'Qing qiu pin lu guo gao');
      if (response.status >= 500) throw new LlmError('server_error', 'Fu wu duan cuo wu (' + response.status + ')');
      throw new LlmError('unknown', 'Qing qiu shi bai (' + response.status + ')');
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '';
    const tokensIn = data.usage?.prompt_tokens || estimateTokens(JSON.stringify(messages));
    const tokensOut = data.usage?.completion_tokens || estimateTokens(content);

    // Parse structured output if schema provided
    let parsed: ParseResult | undefined;
    if (outputSchema && content) {
      parsed = parseStructuredOutput({
        rawContent: content,
        schema: JSON.stringify(outputSchema),
        strict: strictMode ?? false,
      });
      if (parsed.status === 'valid' || parsed.status === 'repaired') {
        content = JSON.stringify(parsed.data);
      } else if (parsed.status === 'fallback' && parsed.fallbackText) {
        content = parsed.fallbackText;
      }
    }

    return {
      content,
      model: data.model || model.name,
      tokensIn,
      tokensOut,
      cost: calculateCost(tokensIn, tokensOut, model),
      parsed,
    };
  } catch (e) {
    if (e instanceof LlmError) throw e;
    if ((e as Error).name === 'AbortError') throw new LlmError('timeout', 'Qing qiu yi qu xiao');
    if ((e as TypeError).message?.includes('fetch')) {
      throw new LlmError('network_error', 'Wang luo lian jie shi bai');
    }
    throw new LlmError('unknown', (e as Error).message || 'Wei zhi cuo wu');
  }
}
export async function callLlmStream(
  messages: Pick<Message, 'role' | 'content'>[],
  options: StructuredLlmCallOptions
): Promise<LlmResponse> {
  const { model, apiKey, onToken, timeout = 30000, signal, outputSchema, strictMode, outputType } = options;
  const endpoint = options.endpoint || FREELLM_ENDPOINT;
  const token = apiKey || '';
  let fullContent = '';
  let tokensOut = 0;

  try {
    const hasTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
    if (hasTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const result: any = await invoke('call_llm_stream', {
          provider: model.providerId,
          model: model.name,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          custom_endpoint: endpoint,
        });
        if (onToken && result.content) onToken(result.content);
        fullContent = result.content || '';
        tokensOut = result.tokensOut || estimateTokens(fullContent);
      } catch (e: any) {
        throw mapTauriError(e);
      }
    } else {
      const url = endpoint + '/chat/completions';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({
          model: model.name,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          max_tokens: 4096,
          stream: true,
        }),
        signal: signal,
      });

      if (!response.ok) {
        if (response.status === 401) throw new LlmError('auth_failed', 'API Key 认证失败');
        if (response.status === 429) throw new LlmError('rate_limited', '请求频率过高');
        if (response.status >= 500) throw new LlmError('server_error', '服务端错误 (' + response.status + ')');
        throw new LlmError('unknown', '请求失败 (' + response.status + ')');
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

    // Parse structured output if schema provided
    let parsed: ParseResult | undefined;
    if (outputSchema && fullContent) {
      parsed = parseStructuredOutput({
        rawContent: fullContent,
        schema: JSON.stringify(outputSchema),
        strict: strictMode ?? false,
      });
      if (parsed.status === 'valid' || parsed.status === 'repaired') {
        fullContent = JSON.stringify(parsed.data);
      } else if (parsed.status === 'fallback' && parsed.fallbackText) {
        fullContent = parsed.fallbackText;
      }
    }

    return {
      content: fullContent,
      model: model.name,
      tokensIn,
      tokensOut,
      cost: calculateCost(tokensIn, tokensOut, model),
      parsed,
    };
  } catch (e) {
    if (e instanceof LlmError) throw e;
    if ((e as Error).name === 'AbortError') throw new LlmError('timeout', '请求已取消');
    throw new LlmError('unknown', (e as Error).message || '未知错误');
  }
}
export async function testConnection(
  endpoint: string,
  apiKey: string
): Promise<{ success: boolean; latency: number; models: string[]; error?: string }> {
  const start = performance.now();
  try {
    const url = endpoint + '/models';
    const response = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + apiKey },
      signal: AbortSignal.timeout(10000),
    });
    const latency = Math.round(performance.now() - start);
    if (!response.ok) {
      return { success: false, latency, models: [], error: 'HTTP ' + response.status + ': ' + response.statusText };
    }
    const data = await response.json();
    const models = (data.data || data.models || []).map((m: any) => m.id || m.name || m);
    return { success: true, latency, models };
  } catch (e: any) {
    const latency = Math.round(performance.now() - start);
    return { success: false, latency, models: [], error: e.message || '连接失败' };
  }
}

function mapTauriError(e: any): LlmError {
  const msg = (e?.message || e?.toString() || '').toLowerCase();
  if (msg.includes('timeout') || msg.includes('timed out')) return new LlmError('timeout', '请求超时');
  if (msg.includes('auth') || msg.includes('401') || msg.includes('key')) return new LlmError('auth_failed', 'API Key 认证失败');
  if (msg.includes('network') || msg.includes('fetch')) return new LlmError('network_error', '网络连接失败');
  return new LlmError('unknown', e?.message || '未知错误');
}
