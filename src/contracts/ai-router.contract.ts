/**
 * ai-router.contract.ts — AI Intent Routing Types (织梦机 v2 / W01)
 *
 * Defines the route classification contract for the AI command router.
 * The router analyzes user messages and determines the appropriate AI action.
 */

/**
 * Enum of all possible AI route intents.
 */
export type AiRoute =
  | 'discuss'
  | 'suggest'
  | 'write_preview'
  | 'generatePacket'
  | 'generateDraft'
  | 'assumption_flow'
  | 'unrecognized';

/**
 * Input for the intent routing pipeline.
 */
export interface RouteInput {
  message: string;
  canvasId: string;
  projectId: string;
  history?: string;
}

/**
 * Output from the intent routing pipeline.
 */
export interface RouteOutput {
  intent: string;
  confidence: number;
  parameters: Record<string, unknown>;
  fallbackReason?: string;
}
