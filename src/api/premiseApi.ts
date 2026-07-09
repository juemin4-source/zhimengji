/**
 * premiseApi — 织梦机 v2 PremiseCard API layer.
 *
 * Handles JSON string conversion for readerQuestions:
 * - Rust stores reader_questions as a JSON string (e.g. '["q1","q2"]')
 * - TS contracts use string[]; conversion happens here.
 */
import { invoke } from '@tauri-apps/api/core';
import type { PremiseCard, CreatePremiseInput, UpdatePremiseInput } from '../contracts/premise.contract';

function parseCard(data: Record<string, unknown>): PremiseCard {
  return {
    ...data as unknown as PremiseCard,
    readerQuestions: typeof data.readerQuestions === 'string'
      ? JSON.parse(data.readerQuestions as string)
      : (data.readerQuestions as string[]),
  };
}

function stringifyCard(input: CreatePremiseInput | UpdatePremiseInput): Record<string, unknown> {
  return {
    ...input,
    readerQuestions: JSON.stringify(input.readerQuestions),
  };
}

export async function createPremiseCard(input: CreatePremiseInput): Promise<PremiseCard> {
  const data = await invoke<Record<string, unknown>>('create_premise_card', {
    input: stringifyCard(input),
  });
  return parseCard(data);
}

export async function listPremiseCards(projectId: string): Promise<PremiseCard[]> {
  const data = await invoke<Record<string, unknown>[]>('list_premise_cards', {
    input: { projectId },
  });
  return data.map(parseCard);
}

export async function getPremiseCard(id: string): Promise<PremiseCard | null> {
  const data = await invoke<Record<string, unknown> | null>('get_premise_card', {
    input: { id },
  });
  return data ? parseCard(data) : null;
}

export async function updatePremiseCard(input: UpdatePremiseInput): Promise<PremiseCard> {
  const data = await invoke<Record<string, unknown>>('update_premise_card', {
    input: stringifyCard(input),
  });
  return parseCard(data);
}

export async function deletePremiseCard(id: string): Promise<void> {
  await invoke('delete_premise_card', { input: { id } });
}
