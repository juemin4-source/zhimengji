/**
 * ai-output.ts — AI 输出三态枚举与行为定义 (织梦机 v2 / D2-UX)
 *
 * 不绑定到任何画板数据——这是 AI 调用时的参数行为。
 * 由 D1 的 contract 层定义，供前端 UI 和生成函数使用。
 */

export type AiOutputType = 'discuss' | 'suggest' | 'write_preview';

export interface AiOutputBehavior {
  type: AiOutputType;
  label: string;
  description: string;
  effect: string;
}

export const AI_OUTPUT_BEHAVIORS: Record<AiOutputType, AiOutputBehavior> = {
  discuss: {
    type: 'discuss',
    label: '讨论',
    description: 'AI 仅以对话形式回复，不影响任何画板数据',
    effect: '不影响画板数据，仅出现在对话气泡中',
  },
  suggest: {
    type: 'suggest',
    label: '建议',
    description: 'AI 以建议卡形式展示，用户采纳后才写入画板',
    effect: '用户采纳后才写入画板数据',
  },
  write_preview: {
    type: 'write_preview',
    label: '写入预览',
    description: 'AI 直接填入画板字段，但需用户确认后才正式生效',
    effect: '用户确认后才写入画板数据',
  },
};
