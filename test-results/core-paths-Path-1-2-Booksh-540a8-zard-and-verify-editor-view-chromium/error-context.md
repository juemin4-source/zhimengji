# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: core-paths.spec.ts >> Path 1+2: Bookshelf -> Create Project -> Editor >> create project via wizard and verify editor view
- Location: e2e\core-paths.spec.ts:206:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: '文档' })
Expected: visible
Error: strict mode violation: getByRole('button', { name: '文档' }) resolved to 2 elements:
    1) <button class="nav-tab active">文档</button> aka getByRole('button', { name: '文档', exact: true })
    2) <button class="tb-btn primary">+ 新建文档</button> aka getByRole('button', { name: '+ 新建文档' })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('button', { name: '文档' })

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - navigation [ref=e4]:
      - button "书架" [ref=e5] [cursor=pointer]:
        - img [ref=e6]
        - text: 书架
      - generic [ref=e9]: 测试作品
      - button "文档" [ref=e10] [cursor=pointer]
      - button "画板" [ref=e11] [cursor=pointer]
      - button "设定集" [ref=e12] [cursor=pointer]
      - button "判断记录" [ref=e13] [cursor=pointer]
      - button "AI" [ref=e14] [cursor=pointer]
      - button "Ctrl+K" [ref=e15] [cursor=pointer]:
        - img [ref=e16]
        - generic [ref=e19]: Ctrl+K
      - button "AI 设置" [ref=e20] [cursor=pointer]:
        - img [ref=e21]
    - generic [ref=e24]:
      - generic [ref=e26]:
        - generic [ref=e27]:
          - generic [ref=e28]:
            - generic [ref=e29]: 大纲
            - button "收起大纲" [ref=e30] [cursor=pointer]:
              - img [ref=e31]
          - generic [ref=e34]:
            - generic [ref=e35]: 暂无对象
            - button "+ 新建文档" [ref=e36] [cursor=pointer]
        - generic [ref=e38]:
          - paragraph [ref=e39]: 选择或创建一个对象
          - generic [ref=e40]:
            - generic [ref=e41]: 使用模板快速创建：
            - button "+ 人物" [ref=e42] [cursor=pointer]
            - button "+ 地点" [ref=e43] [cursor=pointer]
            - button "+ 组织" [ref=e44] [cursor=pointer]
            - button "+ 规则/机制" [ref=e45] [cursor=pointer]
            - button "+ 事件" [ref=e46] [cursor=pointer]
            - button "+ 物品" [ref=e47] [cursor=pointer]
            - button "+ 术语" [ref=e48] [cursor=pointer]
            - button "+ 章节" [ref=e49] [cursor=pointer]
          - generic [ref=e50]: 或在文档中写入 [[对象名]] 来创建引用
      - generic [ref=e51]:
        - heading "项目总览" [level=3] [ref=e52]
        - generic [ref=e53]:
          - generic [ref=e54]:
            - generic [ref=e55]: "0"
            - generic [ref=e56]: 对象数
          - generic [ref=e57]:
            - generic [ref=e58]: "0"
            - generic [ref=e59]: 画板数
          - generic [ref=e60]:
            - generic [ref=e61]: "0"
            - generic [ref=e62]: 设定数
          - generic [ref=e63]:
            - generic [ref=e64]: "0"
            - generic [ref=e65]: 判断数
    - generic [ref=e66]:
      - generic [ref=e68]:
        - img [ref=e69]
        - text: 已保存
      - generic [ref=e71]:
        - generic [ref=e72]: "字数: 0"
        - generic [ref=e73]: "|"
        - generic [ref=e74]: "链接: 0"
  - generic [ref=e75] [cursor=pointer]:
    - img [ref=e77]
    - generic [ref=e79]: 作品「测试作品」已创建
```

# Test source

```ts
  129 |           return { ...(args?.record || {}), id: "mock-judg" };
  130 |         case "save_canvas_tab_state":
  131 |           return { ...(args?.state || {}) };
  132 |         case "create_connection":
  133 |           return { ...(args?.connection || {}) };
  134 |         default:
  135 |           return undefined;
  136 |       }
  137 |     };
  138 |   });
  139 | }
  140 | 
  141 | async function mockExistingProjects(page, objects = []) {
  142 |   const projects = [BOOK_1, BOOK_2];
  143 | 
  144 |   await page.addInitScript(
  145 |     (args) => {
  146 |       window.__TAURI_INTERNALS__ = window.__TAURI_INTERNALS__ || {};
  147 |       window.__TAURI_EVENT_PLUGIN_INTERNALS__ =
  148 |         window.__TAURI_EVENT_PLUGIN_INTERNALS__ || {};
  149 | 
  150 |       const callbacks = new Map();
  151 |       window.__TAURI_INTERNALS__.transformCallback = (callback, once) => {
  152 |         const id = crypto.getRandomValues(new Uint32Array(1))[0];
  153 |         callbacks.set(id, (d) => {
  154 |           if (once) callbacks.delete(id);
  155 |           return typeof callback === "function" ? callback(d) : undefined;
  156 |         });
  157 |         return id;
  158 |       };
  159 |       window.__TAURI_INTERNALS__.unregisterCallback = (id) =>
  160 |         callbacks.delete(id);
  161 | 
  162 |       const projects = args.projects;
  163 |       const objects = args.objects;
  164 | 
  165 |       window.__TAURI_INTERNALS__.invoke = async (cmd, args) => {
  166 |         switch (cmd) {
  167 |           case "list_projects":
  168 |             return projects;
  169 |           case "list_world_objects":
  170 |             return objects;
  171 |           case "get_world_object":
  172 |             return objects.find((o) => o.id === args?.id) || null;
  173 |           case "list_connections":
  174 |             return [];
  175 |           case "list_canvas_tab_states":
  176 |             return [];
  177 |           case "create_world_object":
  178 |             return args?.object || {};
  179 |           case "update_world_object":
  180 |             return undefined;
  181 |           case "delete_world_object":
  182 |             return undefined;
  183 |           case "append_judgment_record":
  184 |             return { ...(args?.record || {}), id: "mock-judg" };
  185 |           case "save_canvas_tab_state":
  186 |             return { ...(args?.state || {}) };
  187 |           case "create_connection":
  188 |             return { ...(args?.connection || {}) };
  189 |           default:
  190 |             return undefined;
  191 |         }
  192 |       };
  193 |     },
  194 |     { projects, objects },
  195 |   );
  196 | }
  197 | 
  198 | async function enterProject(page, projectName) {
  199 |   await page.getByLabel("进入《" + projectName + "》").click();
  200 |   await expect(page.getByTitle("返回书架")).toBeVisible({ timeout: 5000 });
  201 | }
  202 | 
  203 | // ─── Path 1 + 2: Bookshelf -> Create Project -> Editor ────────────
  204 | 
  205 | test.describe("Path 1+2: Bookshelf -> Create Project -> Editor", () => {
  206 |   test("create project via wizard and verify editor view", async ({ page }) => {
  207 |     await mockMutableProjects(page);
  208 |     await page.goto("/");
  209 | 
  210 |     await expect(page.getByText("作品书架")).toBeVisible({ timeout: 10000 });
  211 |     await expect(page.getByText("还没有作品")).toBeVisible();
  212 | 
  213 |     await page.getByRole("button", { name: "新建作品" }).click();
  214 | 
  215 |     await expect(page.getByRole("button", { name: "新建作品" })).toBeVisible({ timeout: 5000 });
  216 | 
  217 |     await page.getByPlaceholder("输入作品名称...").fill("测试作品");
  218 | 
  219 |     await page.getByText("从零开始").first().click();
  220 | 
  221 |     await page.getByRole("button", { name: "下一步" }).click();
  222 |     await page.getByRole("button", { name: "开始创作" }).click();
  223 | 
  224 |     // Dismiss first-launch guide
  225 |     await page.getByText("开始使用").click({ timeout: 10000 });
  226 |     await page.getByRole("button", { name: "跳过" }).click({ timeout: 5000 });
  227 | 
  228 |     // --- Editor view ---
> 229 |     await expect(page.getByRole("button", { name: "文档" })).toBeVisible({ timeout: 5000 });
      |                                                            ^ Error: expect(locator).toBeVisible() failed
  230 |     await expect(page.getByRole("button", { name: "画板" })).toBeVisible();
  231 |     await expect(page.getByRole("button", { name: "设定集" })).toBeVisible();
  232 |     await expect(page.getByRole("button", { name: "判断记录" })).toBeVisible();
  233 |     await expect(page.getByRole("button", { name: "AI" })).toBeVisible();
  234 | 
  235 |     await expect(page.getByTitle("返回书架")).toBeVisible();
  236 |     await expect(page.locator(".doc-outline")).toBeVisible();
  237 |     await expect(page.getByText("选择或创建一个对象")).toBeVisible();
  238 |     await expect(page.getByTitle("AI 设置")).toBeVisible();
  239 |     await expect(page.getByTitle("全局搜索 (Ctrl+K)")).toBeVisible();
  240 |   });
  241 | });
  242 | 
  243 | // ─── Path 3: AI Chat ─────────────────────────────────────────────
  244 | 
  245 | test.describe("Path 3: AI Chat page", () => {
  246 |   test("AI chat loads, shows input, and sends a message", async ({ page }) => {
  247 |     await mockExistingProjects(page, SAMPLE_OBJECTS);
  248 |     await page.goto("/");
  249 | 
  250 |     await expect(page.getByText("作品书架")).toBeVisible({ timeout: 10000 });
  251 |     await enterProject(page, "觉醒纪元");
  252 | 
  253 |     await page.locator("button.nav-tab", { hasText: "AI" }).click();
  254 | 
  255 |     await expect(page.getByText("AI 助手")).toBeVisible({ timeout: 5000 });
  256 |     await expect(page.getByText("你好！我是织梦机的 AI 助手")).toBeVisible();
  257 | 
  258 |     const chatInput = page.getByPlaceholder("输入你的想法，让 AI 帮你创作...");
  259 |     await expect(chatInput).toBeVisible();
  260 | 
  261 |     await expect(page.getByText("人物")).toBeVisible();
  262 |     await expect(page.getByText("陈锋")).toBeVisible();
  263 | 
  264 |     await chatInput.fill("帮我创建一个世界观");
  265 |     await chatInput.press("Enter");
  266 | 
  267 |     await expect(page.getByText("帮我创建一个世界观")).toBeVisible({ timeout: 5000 });
  268 |     await expect(page.getByText("以下是为你创建的世界观设定")).toBeVisible({ timeout: 5000 });
  269 |     await expect(page.getByText("天眼纪元")).toBeVisible({ timeout: 3000 });
  270 |   });
  271 | });
  272 | 
  273 | // ─── Path 4: AI Settings ──────────────────────────────────────────
  274 | 
  275 | test.describe("Path 4: AI Settings overlay", () => {
  276 |   test("AI Settings opens, shows tabs, and can be closed", async ({ page }) => {
  277 |     await mockExistingProjects(page);
  278 |     await page.goto("/");
  279 | 
  280 |     await expect(page.getByText("作品书架")).toBeVisible({ timeout: 10000 });
  281 |     await enterProject(page, "觉醒纪元");
  282 | 
  283 |     await page.getByTitle("AI 设置").click();
  284 | 
  285 |     await expect(page.getByText("设置")).toBeVisible({ timeout: 5000 });
  286 |     await expect(page.getByText("API Keys")).toBeVisible();
  287 |     await expect(page.getByText("模型选择")).toBeVisible();
  288 |     await expect(page.getByText("用量监控")).toBeVisible();
  289 |     await expect(page.getByText("费用")).toBeVisible();
  290 |     await expect(page.getByText("保存设置")).toBeVisible();
  291 | 
  292 |     await page.getByRole("button", { name: "返回" }).first().click();
  293 |     await expect(page.getByTitle("AI 设置")).toBeVisible({ timeout: 3000 });
  294 |   });
  295 | });
  296 | 
  297 | // ─── Path 5: Canvas ──────────────────────────────────────────────
  298 | 
  299 | test.describe("Path 5: Canvas view", () => {
  300 |   test("canvas tab shows canvas sub-tabs and zoom controls", async ({ page }) => {
  301 |     await mockExistingProjects(page);
  302 |     await page.goto("/");
  303 | 
  304 |     await expect(page.getByText("作品书架")).toBeVisible({ timeout: 10000 });
  305 |     await enterProject(page, "觉醒纪元");
  306 | 
  307 |     await page.locator("button.nav-tab", { hasText: "画板" }).click();
  308 | 
  309 |     await expect(page.getByRole("button", { name: "角色关系图" })).toBeVisible({ timeout: 5000 });
  310 |     await expect(page.getByRole("button", { name: "时间线" })).toBeVisible();
  311 |     await expect(page.getByRole("button", { name: "设定推演图" })).toBeVisible();
  312 | 
  313 |     await expect(page.getByTitle("缩小 (Ctrl+-)")).toBeVisible();
  314 |     await expect(page.getByTitle("放大 (Ctrl++)")).toBeVisible();
  315 |     await expect(page.getByTitle("适应画布 (Ctrl+0)")).toBeVisible();
  316 |     await expect(page.getByText("100%")).toBeVisible();
  317 | 
  318 |     await expect(page.getByTitle("选择")).toBeVisible();
  319 |     await expect(page.getByTitle("拖动画布")).toBeVisible();
  320 |     await expect(page.getByTitle("对象卡")).toBeVisible();
  321 |   });
  322 | });
  323 | 
  324 | // ─── Path 6: Judgment Records ────────────────────────────────────
  325 | 
  326 | test.describe("Path 6: Judgment Records page", () => {
  327 |   test("judgment records tab loads with tab navigation", async ({ page }) => {
  328 |     await mockExistingProjects(page, SAMPLE_OBJECTS);
  329 |     await page.goto("/");
```