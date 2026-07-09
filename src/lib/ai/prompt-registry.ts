/**
 * prompt-registry.ts — AI Prompt/Skill Registry
 *
 * Maintains a registry of available AI skills with versioned prompt templates,
 * input/output schemas. Contains 5 hardcoded default skills that are seeded
 * into the ai_skill_registry DB table on first run.
 *
 * This class wraps Tauri commands (list_skills, get_skill, register_skill).
 * If Tauri is unavailable, it falls back to the in-memory defaults.
 */

import { invoke } from '@tauri-apps/api/core';
import type { SkillRecord, ListSkillsOutput, RegisterSkillInput } from '../../contracts/ai-registry.contract';

// ===== Default Skill Definitions =====

const DEFAULT_SKILLS: SkillRecord[] = [
  {
    id: '',
    skillId: 'premise.five_step',
    name: 'premise five-step method',
    promptTemplate: [
      'You are a professional premise analyst. Given the following {{story_type}} story input, generate a five-step premise:',
      '',
      '1. **Protagonist**: {{protagonist}}',
      '2. **Situation**: {{situation}}',
      '3. **Objective**: {{objective}}',
      '4. **Obstacle**: {{obstacle}}',
      '5. **Stakes**: {{stakes}}',
      '',
      'Output in JSON format.',
    ].join('\n'),
    inputSchema: JSON.stringify({
      type: 'object',
      properties: {
        story_type: { type: 'string' },
        protagonist: { type: 'string' },
        situation: { type: 'string' },
        objective: { type: 'string' },
        obstacle: { type: 'string' },
        stakes: { type: 'string' },
      },
      required: ['story_type', 'protagonist', 'situation', 'objective', 'obstacle', 'stakes'],
    }),
    outputSchema: JSON.stringify({
      type: 'object',
      properties: {
        premise: { type: 'string' },
        fiveSteps: { type: 'array' },
      },
      required: ['premise', 'fiveSteps'],
    }),
    version: '1.0.0',
  },
  {
    id: '',
    skillId: 'structure.l1_l4',
    name: 'structure L1-L4 outline',
    promptTemplate: [
      'You are a story structure architect. Given the premise {{premise_text}} and genre {{genre}},',
      'generate a four-level structural outline:',
      '',
      'L1 — Story Arc (beginning / middle / end)',
      'L2 — Acts (1-3 or 1-5)',
      'L3 — Sequences (3-6 per act)',
      'L4 — Scenes (key scenes per sequence)',
      '',
      'Output in JSON format.',
    ].join('\n'),
    inputSchema: JSON.stringify({
      type: 'object',
      properties: {
        premise_text: { type: 'string' },
        genre: { type: 'string' },
      },
      required: ['premise_text', 'genre'],
    }),
    outputSchema: JSON.stringify({
      type: 'object',
      properties: {
        l1Arc: { type: 'string' },
        l2Acts: { type: 'array' },
        l3Sequences: { type: 'array' },
        l4Scenes: { type: 'array' },
      },
      required: ['l1Arc', 'l2Acts', 'l3Sequences', 'l4Scenes'],
    }),
    version: '1.0.0',
  },
  {
    id: '',
    skillId: 'setting.sparrow_9_3',
    name: 'setting sparrow 9-grid 3.0',
    promptTemplate: [
      'You are a worldbuilding specialist using the 9-Panel Setting System v3.',
      'Given the premise {{premise_text}} and genre {{genre}}, fill in 9 panels:',
      '',
      '1. Space (physical environment)',
      '2. Time (era / timeline)',
      '3. Society (power structures)',
      '4. Magic / Tech (rules of the world)',
      '5. Economy (resources & trade)',
      '6. Culture (norms & values)',
      '7. History (key events)',
      '8. Factions (key groups)',
      '9. Mood (emotional tone)',
      '',
      'Output in JSON format.',
    ].join('\n'),
    inputSchema: JSON.stringify({
      type: 'object',
      properties: {
        premise_text: { type: 'string' },
        genre: { type: 'string' },
      },
      required: ['premise_text', 'genre'],
    }),
    outputSchema: JSON.stringify({
      type: 'object',
      properties: {
        panels: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              panelId: { type: 'integer' },
              title: { type: 'string' },
              content: { type: 'string' },
            },
          },
        },
      },
      required: ['panels'],
    }),
    version: '1.0.0',
  },
  {
    id: '',
    skillId: 'packet.three_detail_modes',
    name: 'packet three detail modes',
    promptTemplate: [
      'You are a chapter packet detailer. Given the chapter {{chapter_title}}',
      'and outline {{outline_text}}, generate three detail modes:',
      '',
      '**Full Mode**: max detail with character intents, scene by scene',
      '**Balanced Mode**: key scenes with summary for transitions',
      '**Sparse Mode**: bullet-point outline only',
      '',
      'Output in JSON format.',
    ].join('\n'),
    inputSchema: JSON.stringify({
      type: 'object',
      properties: {
        chapter_title: { type: 'string' },
        outline_text: { type: 'string' },
      },
      required: ['chapter_title', 'outline_text'],
    }),
    outputSchema: JSON.stringify({
      type: 'object',
      properties: {
        fullDetail: { type: 'string' },
        balancedDetail: { type: 'string' },
        sparseDetail: { type: 'string' },
      },
      required: ['fullDetail', 'balancedDetail', 'sparseDetail'],
    }),
    version: '1.0.0',
  },
  {
    id: '',
    skillId: 'draft.chapter_writer',
    name: 'draft chapter writer',
    promptTemplate: [
      'You are a fiction prose writer. Based on the chapter packet {{packet_json}}',
      'and detail mode {{detail_mode}}, write the complete chapter draft.',
      '',
      'Maintain consistent {{character_voice}} and {{narrative_distance}}.',
      'Follow the outline structure precisely.',
      '',
      'Output the chapter in plain text with proper paragraph breaks.',
    ].join('\n'),
    inputSchema: JSON.stringify({
      type: 'object',
      properties: {
        packet_json: { type: 'string' },
        detail_mode: { type: 'string', enum: ['full', 'balanced', 'sparse'] },
        character_voice: { type: 'string' },
        narrative_distance: { type: 'string' },
      },
      required: ['packet_json', 'detail_mode', 'character_voice', 'narrative_distance'],
    }),
    outputSchema: JSON.stringify({
      type: 'object',
      properties: {
        chapter_text: { type: 'string' },
        word_count: { type: 'integer' },
      },
      required: ['chapter_text', 'word_count'],
    }),
    version: '1.0.0',
  },
];

// ===== SkillRegistry Class =====

const hasTauri = (): boolean =>
  typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;

export class SkillRegistry {
  private defaults: SkillRecord[] = DEFAULT_SKILLS;

  /**
   * List all registered skills. Falls back to defaults if backend unavailable.
   */
  async listSkills(): Promise<ListSkillsOutput> {
    if (!hasTauri()) {
      return { skills: this.defaults };
    }
    try {
      const result = await invoke<ListSkillsOutput>('list_skills', {
        input: { projectId: 'default' },
      });
      return result;
    } catch {
      return { skills: this.defaults };
    }
  }

  /**
   * Get a single skill by its skillId or DB id.
   */
  async getSkill(skillId: string): Promise<SkillRecord | null> {
    if (!hasTauri()) {
      return this.defaults.find((s) => s.skillId === skillId) ?? null;
    }
    try {
      const skills = await this.listSkills();
      return skills.skills.find((s) => s.skillId === skillId || s.id === skillId) ?? null;
    } catch {
      return this.defaults.find((s) => s.skillId === skillId) ?? null;
    }
  }

  /**
   * Register a new skill in the registry.
   */
  async registerSkill(input: RegisterSkillInput): Promise<SkillRecord> {
    if (!hasTauri()) {
      throw new Error('Backend unavailable: cannot register skill');
    }
    return invoke<SkillRecord>('register_skill', { input });
  }

  /**
   * Get the default skill definitions (for seeding or reference).
   */
  getDefaults(): SkillRecord[] {
    return this.defaults;
  }
}

// Singleton export
export const skillRegistry = new SkillRegistry();
