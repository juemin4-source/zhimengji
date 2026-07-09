/**
 * ai-parser.contract.ts — AI Output Parser Types (织梦机 v2 / W01)
 *
 * Defines the contract for parsing and validating structured AI output.
 * Supports strict validation, auto-repair, fallback extraction, and full failure modes.
 */

/**
 * Status of the parsing operation.
 */
export type ParserStatus = 'valid' | 'repaired' | 'fallback' | 'failed';

/**
 * Input for the structured parser pipeline.
 */
export interface ParseInput {
  rawContent: string;
  schema: string;
  strict: boolean;
}

/**
 * Output from the structured parser pipeline.
 */
export interface ParseOutput {
  data: Record<string, unknown>;
  validationErrors: string[];
  repairLog: string[];
  fallbackText?: string;
}
