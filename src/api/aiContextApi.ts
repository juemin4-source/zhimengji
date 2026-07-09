/**
 * aiContextApi — 织梦机 v2.0.2 AI Context & Router API layer.
 *
 * Wraps context builder and router behind Tauri invoke calls.
 * Each function calls the corresponding Tauri command.
 * Follows the pattern from premiseApi.ts / structureApi.ts.
 */

import { invoke } from '@tauri-apps/api/core';
import type { ContextBuildInput, AiBuiltContext } from '../contracts/ai-context.contract';
import type { RouteInput, RouteOutput } from '../contracts/ai-router.contract';

/**
 * Build AI context for a given canvas and output type.
 * Delegates to the Tauri `build_context` command which calls the Rust
 * context_builder module, or the TypeScript context-builder directly.
 */
export async function fetchAiContext(input: ContextBuildInput): Promise<AiBuiltContext> {
  return invoke<AiBuiltContext>('build_context', { input });
}

/**
 * Route a user AI message to the appropriate intent path.
 * Delegates to the Tauri `route_intent` command.
 */
export async function routeAiMessage(input: RouteInput): Promise<RouteOutput> {
  return invoke<RouteOutput>('route_intent', { input });
}
