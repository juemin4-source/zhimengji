/**
 * settingApi — 织梦机 v2 WorldRule / CharacterCard / FactionCard API layer.
 *
 * Handles JSON string conversion for FactionCard fields:
 * - Rust stores resources & representative_character_ids as JSON strings
 * - TS contracts use string[]; conversion happens here.
 */
import { invoke } from '@tauri-apps/api/core';
import type {
  WorldRule, CreateWorldRuleInput, UpdateWorldRuleInput,
  CharacterCard, CreateCharacterCardInput, UpdateCharacterCardInput,
  FactionCard, CreateFactionCardInput, UpdateFactionCardInput,
} from '../contracts/setting.contract';

// ---- WorldRule ----

export async function createWorldRule(input: CreateWorldRuleInput): Promise<WorldRule> {
  return invoke('create_world_rule', { input });
}

export async function listWorldRules(projectId: string): Promise<WorldRule[]> {
  return invoke('list_world_rules', { input: { projectId } });
}

export async function getWorldRule(id: string): Promise<WorldRule | null> {
  return invoke('get_world_rule', { input: { id } });
}

export async function updateWorldRule(input: UpdateWorldRuleInput): Promise<WorldRule> {
  return invoke('update_world_rule', { input });
}

export async function deleteWorldRule(id: string): Promise<void> {
  return invoke('delete_world_rule', { input: { id } });
}

// ---- CharacterCard ----

export async function createCharacterCard(input: CreateCharacterCardInput): Promise<CharacterCard> {
  return invoke('create_character_card', { input });
}

export async function listCharacterCards(projectId: string): Promise<CharacterCard[]> {
  return invoke('list_character_cards', { input: { projectId } });
}

export async function getCharacterCard(id: string): Promise<CharacterCard | null> {
  return invoke('get_character_card', { input: { id } });
}

export async function updateCharacterCard(input: UpdateCharacterCardInput): Promise<CharacterCard> {
  return invoke('update_character_card', { input });
}

export async function deleteCharacterCard(id: string): Promise<void> {
  return invoke('delete_character_card', { input: { id } });
}

// ---- FactionCard (with JSON string conversion) ----

function parseFactionCard(data: Record<string, unknown>): FactionCard {
  return {
    ...data as unknown as FactionCard,
    resources: typeof data.resources === 'string'
      ? JSON.parse(data.resources as string)
      : (data.resources as string[]),
    representativeCharacterIds: typeof data.representativeCharacterIds === 'string'
      ? JSON.parse(data.representativeCharacterIds as string)
      : (data.representativeCharacterIds as string[]),
  };
}

function stringifyFactionInput(input: CreateFactionCardInput | UpdateFactionCardInput): Record<string, unknown> {
  return {
    ...input,
    resources: JSON.stringify(input.resources),
    representativeCharacterIds: JSON.stringify(input.representativeCharacterIds),
  };
}

export async function createFactionCard(input: CreateFactionCardInput): Promise<FactionCard> {
  const data = await invoke<Record<string, unknown>>('create_faction_card', {
    input: stringifyFactionInput(input),
  });
  return parseFactionCard(data);
}

export async function listFactionCards(projectId: string): Promise<FactionCard[]> {
  const data = await invoke<Record<string, unknown>[]>('list_faction_cards', {
    input: { projectId },
  });
  return data.map(parseFactionCard);
}

export async function getFactionCard(id: string): Promise<FactionCard | null> {
  const data = await invoke<Record<string, unknown> | null>('get_faction_card', {
    input: { id },
  });
  return data ? parseFactionCard(data) : null;
}

export async function updateFactionCard(input: UpdateFactionCardInput): Promise<FactionCard> {
  const data = await invoke<Record<string, unknown>>('update_faction_card', {
    input: stringifyFactionInput(input),
  });
  return parseFactionCard(data);
}

export async function deleteFactionCard(id: string): Promise<void> {
  return invoke('delete_faction_card', { input: { id } });
}
