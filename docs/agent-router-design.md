# Agent 路由逻辑设计 — 织梦机 v2.0

> 版本: v2.0-router-2026-07-08
> 状态: 实现方案研究完成，可直接编码

---

## 目录

- [一、路由架构总览](#一路由架构总览)
- [二、状态机设计](#二状态机设计)
- [三、Orchestrator 路由逻辑](#三orchestrator-路由逻辑)
- [四、Skill 链编排](#四skill-链编排)
- [五、三路深度路由](#五三路深度路由)
- [六、UI 层集成](#六ui-层集成)
- [七、错误与边界情况](#七错误与边界情况)

---

## 一、路由架构总览

### 为什么不用 xstate

| 方案 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| **xstate v5** | 可视化、类型安全、测试工具 | ~60KB，学习曲线，状态 < 10 用不上 | ❌ 太重 |
| **Zustand** | 轻量(1KB)，广泛使用 | 不是状态机，允许非法转换 | ❌ 不安全 |
| **自研状态机** | ~150行，精确匹配需求，零依赖 | 没有可视化工具 | ✅ |

### 选择自研状态机

织梦机的 Agent 路由特点是：
1. **状态数极少**：7 个状态（idle → routing → architect/writing/reader/inspecting → completed）
2. **转换线性**：大致是串行链，极少平行路径
3. **不需要历史/回退/分叉**等复杂状态机特性
4. **织梦机已有 ReactFlow、Tiptap 等大依赖**，再加 xstate 不值得

自研状态机核心逻辑 ~150 行，放在 `src/agents/agent-router.ts`。

---

## 二、状态机设计

### 2.1 状态定义

```typescript
// agents/agent-router.ts — 完整状态机

export type AgentState =
  | 'idle'            // 等待用户输入
  | 'analyzing'       // Orchestrator 分析用户意图
  | 'architecting'    // Architect Agent 执行中
  | 'writing'         // Writer Agent 执行中
  | 'reading'         // Reader Agent 执行中
  | 'inspecting'      // Inspector Agent 执行中
  | 'completed'       // 全部完成
  | 'error';          // 不可恢复错误

export type AgentIntent =
  | 'full_pipeline'     // 完整链: Architect → Writer → Reader → Inspector
  | 'character_design'  // 仅人物设计
  | 'fate_design'       // 仅命运结构
  | 'scene_write'       // 仅场景写作
  | 'aesthetic_review'  // 仅审美检查
  | 'reader_review'     // 仅读者验证
  | 'consistency_check' // 仅一致性检查（Inspector）
  | 'custom_chain';     // 用户指定 skill 列表

// 转换上下文
export interface RouterContext {
  userInput: string;
  intent: AgentIntent | null;
  userDepth: UserDepth;
  activeChainId: string | null;
  completedChains: string[];
  failedSkills: string[];
  results: Map<string, SkillOutput>;
  error: AgentError | null;
}
```

### 2.2 转换表

```typescript
// 状态转换定义 — 确定性转换矩阵
const TRANSITIONS: TransitionTable = {
  idle: {
    on: {
      START: { to: 'analyzing', guard: 'hasInput' },
    },
  },
  analyzing: {
    on: {
      ROUTE_TO_ARCHITECT: { to: 'architecting' },
      ROUTE_TO_WRITER: { to: 'writing' },
      ROUTE_TO_READER: { to: 'reading' },
      ROUTE_TO_INSPECTOR: { to: 'inspecting' },
      CANCEL: { to: 'idle' },
    },
  },
  architecting: {
    on: {
      CHAIN_COMPLETE: { to: 'writing', guard: 'hasNextChain' },
      ALL_CHAINS_DONE: { to: 'reading' },
      CANCEL: { to: 'idle' },
      ERROR: { to: 'error', guard: 'unrecoverable' },
    },
  },
  writing: {
    on: {
      ALL_CHAINS_DONE: { to: 'reading' },
      CANCEL: { to: 'idle' },
    },
  },
  reading: {
    on: {
      ALL_CHAINS_DONE: { to: 'inspecting' },
      NEEDS_REWRITE: { to: 'writing' },           // Reader 发现问题 → 返回 Writer
      CANCEL: { to: 'idle' },
    },
  },
  inspecting: {
    on: {
      GATE_PASS: { to: 'completed' },
      GATE_REWRITE: { to: 'writing' },            // Gate 不通过 → 返回 Writer
      GATE_BLOCKED: { to: 'idle' },                // Blocked → 用户必须介入
      CANCEL: { to: 'idle' },
    },
  },
  completed: {
    on: {
      RESET: { to: 'idle' },
    },
  },
  error: {
    on: {
      RETRY: { to: 'analyzing' },                  // 重试
      RESET: { to: 'idle' },                       // 放弃
    },
  },
};

// Guard 条件
const GUARDS = {
  hasInput: (ctx: RouterContext) => ctx.userInput.trim().length > 0,
  hasNextChain: (ctx: RouterContext) => {
    // Agent 内部还有未执行的 skill 链
    const agentChains = AGENT_SKILLS[ctx.activeAgent]?.chains || [];
    return ctx.completedChains.length < agentChains.length;
  },
  unrecoverable: (ctx: RouterContext) => {
    return ctx.error?.severity === 'critical';
  },
};
```

### 2.3 状态机实现

```typescript
// 核心状态机类 — ~150 行
export class AgentStateMachine {
  private state: AgentState = 'idle';
  private context: RouterContext;
  private listeners: Set<StateChangeListener> = new Set();

  constructor(initialContext?: Partial<RouterContext>) {
    this.context = {
      userInput: '',
      intent: null,
      userDepth: 'auto',
      activeChainId: null,
      completedChains: [],
      failedSkills: [],
      results: new Map(),
      error: null,
      ...initialContext,
    };
  }

  // 发送事件
  dispatch(event: AgentEvent): boolean {
    const transition = TRANSITIONS[this.state]?.on[event.type];
    if (!transition) return false;

    // 检查 guard
    if (transition.guard && !GUARDS[transition.guard](this.context)) {
      return false;
    }

    const prevState = this.state;
    this.state = transition.to;
    this.notify(prevState, event);
    return true;
  }

  // 订阅状态变更
  subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // 获取当前状态
  getState(): { state: AgentState; context: RouterContext } {
    return { state: this.state, context: { ...this.context } };
  }

  // 更新上下文
  updateContext(update: Partial<RouterContext>): void {
    this.context = { ...this.context, ...update };
  }

  private notify(prevState: AgentState, event: AgentEvent): void {
    for (const listener of this.listeners) {
      listener({ prevState, currentState: this.state, event, context: this.context });
    }
  }
}
```

### 2.4 与 React Hook 的连接

```typescript
// hooks/useAgentEngine.ts
export function useAgentEngine() {
  const [state, setState] = useState<AgentState>('idle');
  const [context, setContext] = useState<RouterContext>(defaultContext);
  const machineRef = useRef<AgentStateMachine | null>(null);

  useEffect(() => {
    const machine = new AgentStateMachine();
    machine.subscribe((update) => {
      setState(update.currentState);
      setContext({ ...update.context });
    });
    machineRef.current = machine;
    return () => { /* cleanup */ };
  }, []);

  const startAgent = useCallback((input: string) => {
    machineRef.current?.updateContext({ userInput: input });
    machineRef.current?.dispatch({ type: 'START' });
    // → 触发 analyzeUserIntent (异步)
    analyzeUserIntent(input).then(intent => {
      machineRef.current?.updateContext({ intent });
      // → 路由到对应 Agent
      routeToAgent(intent, machineRef.current!);
    });
  }, []);

  return {
    state,
    context,
    startAgent,
    cancel: () => machineRef.current?.dispatch({ type: 'CANCEL' }),
    confirm: (id: string, approve: boolean, mod?: any) => {
      // 处理深度控制的确认/拒绝
    },
  };
}
```

---

## 三、Orchestrator 路由逻辑

### 3.1 意图分析

```typescript
// orchestrator.ts — Orchestrator 核心路由逻辑

// 从用户输入分析意图 → 映射到 AgentIntent
async function analyzeUserIntent(input: string): Promise<AgentIntent> {
  // 方法: 规则 + LLM 轻量分类
  // 先用关键词规则快速分类，不明确的再调 LLM

  // === 规则层 ===
  const lower = input.toLowerCase();

  // 人物相关
  if (/人物|角色|性格|私|处|执|为/.test(lower)) return 'character_design';
  // 命运/结构相关
  if (/命运|结构|大纲|时位|周期|入口/.test(lower)) return 'fate_design';
  // 写作相关
  if (/写|场景|段落|章节|现场|文笔/.test(lower)) return 'scene_write';
  // 审美相关
  if (/审美|具象|复调|余地|得度/.test(lower)) return 'aesthetic_review';
  // 读者相关
  if (/读者|欲望|入口|节奏|认知/.test(lower)) return 'reader_review';
  // 一致性检查
  if (/一致|矛盾|冲突|检查|校验/.test(lower)) return 'consistency_check';
  // "帮我写" 类综合需求
  if (/帮我|生成|创建|新/.test(lower)) return 'full_pipeline';

  // === LLM 层（仅当规则不匹配）===
  // 调用 byok_call_llm 对输入做意图分类
  // 使用 lightweight 模型
  const response = await byokCallLlm('_intent_classifier', {
    system: '将用户的写作需求分类为以下之一: full_pipeline, character_design, ...',
    messages: [{ role: 'user', content: input }],
  }, 'lightweight');

  return parseIntent(response.content);
}

// 根据意图路由到正确 Agent
async function routeToAgent(intent: AgentIntent, machine: AgentStateMachine): Promise<void> {
  switch (intent) {
    case 'full_pipeline':
      // 完整链 → 先 Architect 再 Writer 再 Reader 再 Inspector
      machine.dispatch({ type: 'ROUTE_TO_ARCHITECT' });
      await executeAgentChain('architect', machine);
      machine.dispatch({ type: 'CHAIN_COMPLETE' });
      machine.dispatch({ type: 'ROUTE_TO_WRITER' });
      await executeAgentChain('writer', machine);
      machine.dispatch({ type: 'ALL_CHAINS_DONE' });
      // → 自动进入 Reader → Inspector
      break;

    case 'character_design':
      machine.dispatch({ type: 'ROUTE_TO_ARCHITECT' });
      await executeAgentChain('architect', machine, ['character']);
      machine.dispatch({ type: 'ALL_CHAINS_DONE' });
      // 不需要 Writer → 直接完成
      machine.dispatch({ type: 'RESET' });
      break;

    case 'scene_write':
      machine.dispatch({ type: 'ROUTE_TO_WRITER' });
      await executeAgentChain('writer', machine, ['scene', 'aesthetics']);
      machine.dispatch({ type: 'ALL_CHAINS_DONE' });
      break;

    // ... 其他 intent
  }
}
```

### 3.2 Agent 执行引擎

```typescript
// 执行一个 Agent 的所有 skill 链
async function executeAgentChain(
  agentId: string,
  machine: AgentStateMachine,
  chainFilter?: string[]
): Promise<void> {
  const agent = AGENT_SKILLS[agentId];
  const chains = chainFilter
    ? agent.chains.filter(c => chainFilter.includes(c.id))
    : agent.chains;

  for (const chain of chains) {
    machine.updateContext({ activeChainId: chain.id });

    // 按拓扑顺序执行 chain 中的 skill
    const sortedSkills = topologicalSort(chain.skills); // 按 dependsOn 排序

    for (const skillId of sortedSkills) {
      const skillDef = await loadSkillDefinition(skillId);
      const userDepth = machine.getState().context.userDepth;

      // 执行 skill
      try {
        const output = await executeSkill(skillDef, userDepth);
        machine.updateContext({
          results: new Map(machine.getState().context.results).set(skillId, output),
        });

        // 如果深度模式需要确认，暂停等待
        if (needsConfirmation(skillDef, userDepth)) {
          await waitForUserConfirmation(skillId, output);
        }
      } catch (error) {
        machine.updateContext({
          failedSkills: [...machine.getState().context.failedSkills, skillId],
        });
        // 非关键 skill 失败继续，关键 skill 失败停止 chain
        if (isCritical(skillDef)) {
          throw error;
        }
      }
    }

    machine.updateContext({
      completedChains: [...machine.getState().context.completedChains, chain.id],
    });
  }
}
```

---

## 四、Skill 链编排

### 4.1 拓扑排序

```typescript
// chain-engine.ts — Skill 链的拓扑排序

function topologicalSort(skillIds: string[]): string[] {
  // 构建依赖图
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const id of skillIds) {
    if (!graph.has(id)) graph.set(id, []);
    if (!inDegree.has(id)) inDegree.set(id, 0);

    const skill = SKILL_REGISTRY[id];
    for (const dep of skill.callChain.dependsOn) {
      if (skillIds.includes(dep)) {
        graph.get(dep)!.push(id);
        inDegree.set(id, (inDegree.get(id) || 0) + 1);
      }
    }
  }

  // 拓扑排序 (Kahn's algorithm)
  // 无依赖的 skill 先执行，有依赖的等上游完成后执行
  // 同一批次中无互相依赖的 skill 并行执行
  const result: string[] = [];
  const queue: string[] = [];

  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  while (queue.length > 0) {
    const batch = [...queue];  // 这一批次可并行
    queue.length = 0;
    result.push(...batch);

    for (const id of batch) {
      for (const neighbor of graph.get(id) || []) {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }
    // batch → 交给 chain-engine 并行执行
    // 这里返回拓扑序，并行由 executor 决定
  }

  return result;
}
```

### 4.2 并行执行优化

```typescript
// 同一层无依赖的 skill 可并行调用 LLM
// 例如 CS-01(具象) 和 CS-02(复调) 没有依赖关系
// 可以同时调用 byok_call_llm

async function executeBatch(
  skillIds: string[],
  context: SkillContext
): Promise<Map<string, SkillOutput>> {
  const results = new Map<string, SkillOutput>();

  // 同一批次的 skill 并行执行
  const promises = skillIds.map(async (id) => {
    const output = await executeSingleSkill(id, context);
    results.set(id, output);
  });

  await Promise.allSettled(promises);
  return results;
}
```

---

## 五、三路深度路由

### 5.1 深度配置加载

```typescript
// depth-control.ts — 三路深度控制

// 用户深度配置（全局 + skill 级覆盖）
interface UserDepthConfig {
  global: UserDepth;         // 'auto' | 'suggest' | 'manual'
  overrides: Record<string, UserDepth>;  // per-skill 覆盖
}

// 在 Agent 执行层面控制交互密度
function needsConfirmation(
  skillDef: SkillDefinition,
  userDepth: UserDepth
): boolean {
  const depthConfig = skillDef.depthControl[userDepth];
  if (depthConfig.confirmRequired === false) return false;
  if (depthConfig.confirmRequired === true) return true;
  if (depthConfig.confirmRequired === 'each_dimension') return true;
  if (depthConfig.confirmRequired === 'once_per_chain') {
    // 只对 chain 中的第一个 skill 需要确认
    // 实际由 chain-engine 在链级别控制
    return false;
  }
  return false;
}
```

### 5.2 三层路由行为

```typescript
// 各深度模式下 Agent 路由的行为差异

const DEPTH_BEHAVIOR: Record<UserDepth, DepthBehavior> = {
  auto: {
    // Orchestrator: 自动分析意图，不显示中间路由决策
    // Agent: 全部自动执行，不暂停等待
    // Output: 最终综合报告
    // 异常: 自动重试 3 次，失败后显示错误
    orchestrator: { showRouting: false, requireIntentConfirm: false },
    execution: { pauseOnConfirm: false, autoRetry: 3 },
    output: { level: 'summary', showSkills: false },
  },

  suggest: {
    // Orchestrator: 分析后显示"检测到您的需求是...，将运行以下 skill 链"
    // Agent: 执行后显示建议，等待用户确认
    // Output: 详细分析 + 建议修改
    // 异常: 显示错误并建议下一步
    orchestrator: { showRouting: true, requireIntentConfirm: true },
    execution: { pauseOnConfirm: true, autoRetry: 1 },
    output: { level: 'detailed', showSkills: true },
  },

  manual: {
    // Orchestrator: 显示完整的 skill 链选择
    // Agent: 每步停等，用户可修改中间参数
    // Output: 原始数据 + 完整分析
    // 异常: 停等用户决定
    orchestrator: { showRouting: true, requireIntentConfirm: true, showAllSkills: true },
    execution: { pauseOnConfirm: true, pauseBeforeEachSkill: true, autoRetry: 0 },
    output: { level: 'full', showSkills: true, showRawData: true },
  },
};
```

---

## 六、UI 层集成

### 6.1 AgentConsole 组件

```typescript
// components/ai/AgentConsole.tsx — 设计契约

// Props
interface AgentConsoleProps {
  state: AgentState;
  context: RouterContext;
  onStart: (input: string) => void;
  onCancel: () => void;
  onConfirm: (requestId: string, approve: boolean, modification?: any) => void;
  depth: UserDepth;
  onDepthChange: (depth: UserDepth) => void;
}

// 视图状态
// idle: 显示输入框 + 深度选择器
// analyzing: 显示"分析中..." + 取消按钮
// architecting: 显示 Architect 进度 (skill 链 + 进度条)
// writing: 显示 Writer 进度
// reading: 显示 Reader 报告
// inspecting: 显示 Inspector Gate 结果
// completed: 显示最终结果 + "再试一次"按钮
// error: 显示错误 + 重试/取消按钮
```

### 6.2 Agent 控制台布局

```
┌─────────────────────────────────────────────────────┐
│ [💡 AI 助手]  [🎯 Agent 模式]  [深度: 自动 ▼]      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─ Agent 进度 ──────────────────────────────────┐ │
│  │                                                │ │
│  │  🏗️ Architect                                 │ │
│  │  ■■■■■■■□□□ 70%  →  人物设计链                │ │
│  │    ├ CS-10 机制受力      ✅ 完成                │ │
│  │    ├ CS-11 私诊断       ✅ 完成                │ │
│  │    ├ CS-12 处诊断       ◉ 执行中...            │ │
│  │    ├ CS-13 执诊断       ⏳ 等待中              │ │
│  │    └ ...                                       │ │
│  │                                                │ │
│  │  ✍️ Writer       【⏸等待中】                   │ │
│  │  📖 Reader       【⏸等待中】                   │ │
│  │  🔍 Inspector    【⏸等待中】                   │ │
│  └────────────────────────────────────────────────┘ │
│                                                     │
│  ┌─ 当前 Skill 输出 ───────────────────────────┐   │
│  │                                                │ │
│  │  CS-12 处诊断 — 初步结果                      │ │
│  │                                                │ │
│  │  人物 A 的天/地/人三维分析:                    │ │
│  │  • 天（先定条件）: 出生在战乱地区              │ │
│  │  • 地（行动环境）: 宗门内的权力斗争            │ │
│  │  • 人（社会身份）: 外门弟子，低微出身          │ │
│  │                                                │ │
│  │  ⚠️ 发现: 人维度较单薄                        │ │
│  │                                                │ │
│  │  [✅ 接受]  [✏️ 修改]  [⏭ 跳过此维度]        │ │
│  └────────────────────────────────────────────────┘ │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 6.3 事件时间线

```typescript
// UI 状态更新的事件流
// 1. AgentStateMachine state change → 更新 AgentConsole
// 2. SkillExecutor progress → 更新进度条 + 当前 skill 名称
// 3. SkillExecutor complete → 显示结果卡片
// 4. DepthControl needsConfirmation → 显示确认按钮
// 5. 用户确认/修改 → 继续向下执行
// 6. All chains complete → 显示 Agent 完成状态
```

---

## 七、错误与边界情况

### 7.1 路由异常处理

| 场景 | 行为 |
|------|------|
| **意图分析失败** | 默认走 `full_pipeline`（最安全的选择） |
| **用户输入为空** | 保持在 idle 状态，不做分析 |
| **用户取消执行** | 保存当前结果，回 idle 状态 |
| **Skill 执行失败** | 非关键 skill 跳过，关键 skill 停止 chain |
| **LLM 调用超时** | 自动重试 3 次，仍失败则跳过（返回空结果） |
| **用户切换深度模式** | 正在执行的 skill 用新深度模式继续，已完成的维持原模式 |
| **用户切换 Tab** | Agent 在后台继续执行，不中断（类似下载） |
| **网络断连** | 抛出错误 → 用户手动重试 |
| **Key 被删除** | 所有待执行 skill 报 NoActiveKey → 通知用户添加 Key |

### 7.2 验证检查清单

```
[ ] 所有状态转换是否覆盖？
[ ] 非法状态转换是否被阻止？
[ ] Guard 条件是否完备？
[ ] 用户取消后状态是否正确恢复？
[ ] 并行 skill 执行的竞态是否存在？
[ ] 深度模式切换是否影响正在执行的 skill？
[ ] 连续的 RESET → START 是否工作？
[ ] Skill 链中某个 skill 失败后下游是否跳过？
[ ] 用户确认超时是否有默认行为？
[ ] 错误发生后上下文是否完整可查？
```

### 7.3 测试策略

```typescript
// agent-router.test.ts — 状态机测试

// 核心测试用例
const TEST_CASES = [
  {
    name: '完整流水线: idle → analyzing → architect → writer → reader → inspector → completed',
    events: ['START', 'ROUTE_TO_ARCHITECT', 'ALL_CHAINS_DONE', 'ALL_CHAINS_DONE',
             'ALL_CHAINS_DONE', 'GATE_PASS'],
    expectedStates: ['analyzing', 'architecting', 'writing', 'reading', 'inspecting', 'completed'],
  },
  {
    name: 'Reader 发现需要重写: → NEEDS_REWRITE → writing → ...',
    events: ['START', 'ROUTE_TO_ARCHITECT', 'ALL_CHAINS_DONE', 'ALL_CHAINS_DONE',
             'NEEDS_REWRITE', 'ALL_CHAINS_DONE', 'ALL_CHAINS_DONE', 'GATE_PASS'],
    expectedStates: ['analyzing', 'architecting', 'writing', 'reading',
                     'writing', 'reading', 'inspecting', 'completed'],
  },
  {
    name: '用户取消',
    events: ['START', 'CANCEL'],
    expectedStates: ['analyzing', 'idle'],
  },
  {
    name: '无输入时 START → 状态不变',
    events: ['START'],
    expectedStates: ['idle'],
    contextOverride: { userInput: '' },
  },
];
```
