/**
 * generateChapterPacket — 前端 AI 细纲包生成器 (织梦机 v2)
 *
 * 纯前端工具函数，不经过 Tauri command。
 * 读取上游数据 → 构造 prompt → 调用 llm-client → 解析 JSON → 创建 ChapterPacket。
 *
 * 硬规则：
 * - 不 mock AI
 * - 解析失败就抛错误
 * - 不自动 confirm
 */
import { callLlm } from './llm-client';
import { listPremiseCards } from '../api/premiseApi';
import { listStructureNodes } from '../api/structureApi';
import { listCharacterCards, listWorldRules, listFactionCards } from '../api/settingApi';
import { createChapterPacket, updateChapterPacketLayers } from '../api/chapterPacketApi';
import type { PremiseCard } from '../contracts/premise.contract';
import type { StructureNode } from '../contracts/structure.contract';
import type { CharacterCard, WorldRule, FactionCard } from '../contracts/setting.contract';
import type { AiModel } from '../types/ai';
import type { AiOutputType } from './ai-output';

// ─── Types ───

export interface GeneratePacketOptions {
  projectId: string;
  structureNodeId: string;
  chapterNumber: number;
  title?: string;
  model: AiModel;
  /** AI 输出三态：discuss | suggest | write_preview。默认 write_preview */
  outputType?: AiOutputType;
}

export interface UpstreamData {
  premise: PremiseCard | null;
  structureNodes: StructureNode[];
  characters: CharacterCard[];
  rules: WorldRule[];
  factions: FactionCard[];
}

// ─── Prompt Builder ───

export function buildPacketPrompt(
  upstream: UpstreamData,
  options: { chapterNumber: number; title?: string },
): string {
  const { premise, structureNodes, characters, rules, factions } = upstream;

  const lines: string[] = [
    '你是一个专业的叙事细纲助手。请根据以下项目设定数据，为一个新章节生成完整的四层细纲包（ChapterPacket）。',
    '',
    '请严格按照以下 JSON 格式返回，不包含额外说明：',
    '',
    '```json',
    JSON.stringify(
      {
        title: '章节标题',
        line: '线路标记',
        position: '时位（如：动|藏→生）',
        chapterFunction: 'opening|setup|escalation|twist|climax|resolution|bridge|reveal',
        layer1: {
          narrativeDistance: 'close|medium|distant',
          expositionStrategy: 'show_dont_tell|balanced|explain_all',
          characterVoice: 'distinct|moderate|uniform',
          taboos: ['禁忌1', '禁忌2'],
          voiceSamples: [{ characterId: 'char_xxx', sample: '示例对白' }],
        },
        layer2: {
          characters: [{ characterId: 'id', name: '角色名', hook: '钩子', currentState: '当前状态', status: '状态' }],
          scenes: [{ name: '场景名', atmosphere: '氛围' }],
          rules: [{ ruleId: 'id', title: '规则名', description: '规则描述' }],
          recap: '前情提要',
          characterStates: [],
          knowledgeSnapshot: { characterKnowledge: [], readerKnows: [], hiddenFromReader: [] },
        },
        layer3: {
          lines: ['线路标记'],
          position: { from: '起点', to: '终点' },
          chapterFunction: '功能',
          narrative: '80-250字的压缩叙事',
          releases: ['释放信息1'],
          establishes: [{ type: 'establish|foreshadow|pressure', subject: '主体', change: '变化' }],
          annotations: ['注释'],
          assumptions: [],
        },
        layer4: {
          scenes: [
            {
              label: '场景标签',
              location: '地点',
              summary: '概要',
              rhythm: 'slow|medium|fast',
              pov: '视角角色',
              sceneGoal: '场景目标',
              conflict: '冲突',
              allowedKnowledge: [],
              forbiddenKnowledge: [],
            },
          ],
          taboos: ['禁忌'],
        },
      },
      null,
      2,
    ),
    '```',
    '',
    '## 项目设定数据',
    '',
  ];

  // Premise
  if (premise) {
    lines.push(`### 前提`);
    lines.push(premise.premiseText);
    if (premise.storyType) lines.push(`故事类型: ${premise.storyType}`);
    if (premise.readerQuestions.length > 0) {
      lines.push('读者问题:');
      premise.readerQuestions.forEach(q => lines.push(`- ${q}`));
    }
    lines.push('');
  }

  // Structure
  if (structureNodes.length > 0) {
    lines.push('### 章节结构');
    structureNodes.forEach(n => lines.push(`- ${n.title}: ${n.narrativeFunction || ''}`));
    lines.push('');
  }

  // Characters
  if (characters.length > 0) {
    lines.push('### 角色');
    characters.forEach(c =>
      lines.push(`- ${c.name} (id: ${c.id}) ${c.archetype || ''}: ${c.hook || ''}${c.currentWant ? ' · 想要: ' + c.currentWant : ''}`),
    );
    lines.push('');
  }

  // World rules
  if (rules.length > 0) {
    lines.push('### 世界观规则');
    rules.forEach(r => lines.push(`- ${r.title}: ${r.ruleText || ''}`));
    lines.push('');
  }

  // Factions
  if (factions.length > 0) {
    lines.push('### 势力');
    factions.forEach(f => lines.push(`- ${f.name}: ${f.trueGoal || f.publicSlogan || ''}`));
    lines.push('');
  }

  // Requirements
  lines.push('## 要求');
  lines.push(`- 这是第 ${options.chapterNumber} 章`);
  if (options.title) lines.push(`- 标题建议: ${options.title}`);
  lines.push('- 返回严格的 JSON，使用 ```json 代码块包裹');
  lines.push('- layer1 和 layer2 中的角色 ID 使用上面提供的 id 值');
  lines.push('- layer3.narrative 控制在 80-250 字之间');
  lines.push('- layer4.scenes 中的角色名保持一致');
  lines.push('- 所有内容使用中文');

  return lines.join('\n');
}

// ─── Response Parser ───

/**
 * 从 AI 回复中提取 JSON 对象。
 * 处理 ```json 包裹、纯 JSON、以及文本中包含 JSON 的情况。
 * 解析失败则抛出错误——不做 fallback mock。
 */
export function parsePacketResponse(content: string): Record<string, unknown> {
  // Try to extract JSON from markdown code block first
  const jsonBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = jsonBlockMatch ? jsonBlockMatch[1].trim() : content.trim();

  try {
    const parsed = JSON.parse(candidate);
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('AI 返回的不是有效 JSON 对象');
    }
    return parsed;
  } catch (e) {
    // Fallback: try to find the outermost {...} in the response
    const objectMatch = content.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        const parsed = JSON.parse(objectMatch[0]);
        if (typeof parsed === 'object' && parsed !== null) return parsed;
      } catch {
        // fall through to error
      }
    }
    throw new Error(
      'AI 返回的 JSON 无法解析: 响应中找不到有效的 JSON 对象。AI 回复内容:\n' +
        content.slice(0, 500),
    );
  }
}

// ─── Main Generator ───

/**
 * 读取上游数据 → 调用 AI → 创建 ChapterPacket → 写入四层 → 返回更新后的 packet。
 */
export async function generateChapterPacketFromUpstream(options: GeneratePacketOptions) {
  const [premises, nodes, chars, rules, factions] = await Promise.all([
    listPremiseCards(options.projectId),
    listStructureNodes(options.projectId),
    listCharacterCards(options.projectId),
    listWorldRules(options.projectId),
    listFactionCards(options.projectId),
  ]);

  const premise = premises[0] || null;
  const structureNodes = nodes.filter(n => n.nodeType === 'chapter');

  const upstream: UpstreamData = {
    premise,
    structureNodes,
    characters: chars,
    rules,
    factions,
  };

  const prompt = buildPacketPrompt(upstream, {
    chapterNumber: options.chapterNumber,
    title: options.title,
  });

  const response = await callLlm([{ role: 'user', content: prompt }], {
    model: options.model,
    timeout: 60000,
  });

  const packetData = parsePacketResponse(response.content);

  // Step 1: Create packet with metadata
  const created = await createChapterPacket({
    projectId: options.projectId,
    structureNodeId: options.structureNodeId,
    chapterNumber: options.chapterNumber,
    title: (packetData.title as string) || options.title || `第${options.chapterNumber}章`,
    line: (packetData.line as string) || '',
    position: (packetData.position as string) || '',
    chapterFunction: (packetData.chapterFunction as string) || '',
  } as any);

  // Step 2: Update layers
  const updated = await updateChapterPacketLayers({
    packetId: created.id,
    layer1: (packetData.layer1 as any) || {},
    layer2: (packetData.layer2 as any) || {},
    layer3: (packetData.layer3 as any) || {},
    layer4: (packetData.layer4 as any) || {},
    status: 'draft',
  } as any);

  return updated;
}
