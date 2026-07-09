/**
 * command-router.ts — AI Command Router v2 (织梦机 v2.0.2 / W02)
 *
 * Intent recognition that routes user AI requests to 7 paths:
 *   discuss / suggest / write_preview / generatePacket
 *   generateDraft / assumption_flow / unrecognized
 *
 * Uses heuristic keyword matching — no LLM call needed for routing.
 * Unrecognized intents fall back to 'discuss'.
 */

import type { RouteInput, RouteOutput } from '../../contracts/ai-router.contract';
import { AI_OUTPUT_BEHAVIORS } from '../../lib/ai-output';

// Public API

export function route(input: RouteInput): RouteOutput {
  const { intent, confidence, fallbackReason } = detectIntent(input.message);

  const parameters = extractParameters(input.message, intent);

  return {
    intent,
    confidence,
    parameters,
    fallbackReason,
  };
}

// ---------------------------------------------------------------------------
// Intent detection
// ---------------------------------------------------------------------------

function detectIntent(
  message: string,
): { intent: string; confidence: number; fallbackReason?: string } {
  const lower = message.toLowerCase();

  // --- generateDraft (highest priority: explicit action requests) ---
  if (containsAny(lower, [
    '写正文', '写稿', '写章节', '写内容', '写一段', '写草稿',
    'generate draft', 'draft chapter', 'write chapter', 'write prose',
    'write content', 'write text', '生成正文', '生成草稿',
    '帮我写', '帮我撰写',
  ])) {
    return { intent: 'generateDraft', confidence: 0.85 };
  }

  // --- generatePacket ---
  if (containsAny(lower, [
    '生成章节包', '生成大纲', '生成结构', '生成章节',
    'generate packet', 'create packet', 'write outline',
    'generate outline', 'create outline', 'plan chapter',
    '章节规划', '大纲',
  ])) {
    return { intent: 'generatePacket', confidence: 0.85 };
  }

  // --- write_preview ---
  if (containsAny(lower, [
    '写入', '填写', '填入', '自动填写', '自动填充',
    'write to', 'fill in', 'fill out', 'write into',
    '帮我填充', '填入字段', '写入画板',
  ])) {
    return { intent: 'write_preview', confidence: 0.75 };
  }

  // --- suggest ---
  if (containsAny(lower, [
    '建议', '推荐', '有什么', '怎么', '如何', '有哪些',
    'suggest', 'recommend', 'option', 'alternative',
    '有什么建议', '推荐一下', '给点建议',
  ])) {
    return { intent: 'suggest', confidence: 0.70 };
  }

  // --- assumption_flow ---
  if (containsAny(lower, [
    '创建', '新建', '增加', '添加', '新角色', '新地点', '新组织',
    'create', 'add new', 'new character', 'new location', 'new faction',
    'we need', '缺少', '缺一个', '需要', '需要一个',
  ])) {
    return { intent: 'assumption_flow', confidence: 0.65 };
  }

  // --- discuss ---
  if (containsAny(lower, [
    '?', '？', '你好', 'hello', 'hi', '嗨',
    '讨论', '想', '觉得', '认为', 'think', 'opinion',
    'what about', 'how about', 'what do you', 'tell me about',
    'explain', '介绍', '说明',
  ])) {
    return { intent: 'discuss', confidence: 0.60 };
  }

  // --- unrecognized — fallback to discuss ---
  return {
    intent: 'unrecognized',
    confidence: 0.30,
    fallbackReason: 'No clear intent detected. Falling back to discussion mode.',
  };
}

function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(kw));
}

// ---------------------------------------------------------------------------
// Parameter extraction
// ---------------------------------------------------------------------------

function extractParameters(message: string, intent: string): Record<string, unknown> {
  const lower = message.toLowerCase();
  const sourceMessage = message.slice(0, 100);

  switch (intent) {
    case 'generateDraft':
    case 'generatePacket': {
      const chapter = extractChapterRef(lower);
      return { extractedChapter: chapter, sourceMessage };
    }

    case 'assumption_flow': {
      const entityType = extractEntityType(lower);
      return { suggestedEntityType: entityType, sourceMessage };
    }

    default:
      return { sourceMessage };
  }
}

function extractChapterRef(msg: string): string {
  const chapterMatch = msg.match(/chapter\s+(\d+(?:\.\d+)?)/);
  if (chapterMatch) return `Chapter ${chapterMatch[1]}`;

  const chineseMatch = msg.match(/第(\d+)章/);
  if (chineseMatch) return `第${chineseMatch[1]}章`;

  return 'unknown';
}

function extractEntityType(msg: string): string {
  if (containsAny(msg, ['角色', '人物', 'character', 'person'])) return 'character';
  if (containsAny(msg, ['地点', '地方', 'location', 'place', 'world'])) return 'location';
  if (containsAny(msg, ['组织', 'organization', 'faction', 'group'])) return 'faction';
  if (containsAny(msg, ['规则', '机制', 'rule', 'mechanic'])) return 'rule';
  if (containsAny(msg, ['物品', 'item', 'object', 'thing'])) return 'item';
  if (containsAny(msg, ['事件', 'event'])) return 'event';
  if (containsAny(msg, ['术语', 'term', 'definition'])) return 'term';
  return 'unknown';
}
