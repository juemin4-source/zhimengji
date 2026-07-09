# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cdp-golden-path.spec.ts >> v2.0 Golden Path (真实 Tauri 后端) >> 完整五画板管线
- Location: e2e\cdp-golden-path.spec.ts:21:3

# Error details

```
Test timeout of 45000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - button "书架" [ref=e5] [cursor=pointer]:
      - img [ref=e6]
      - text: 书架
    - generic [ref=e9]: CDP Golden Path
    - generic [ref=e10]:
      - button "前提" [ref=e11] [cursor=pointer]:
        - img [ref=e13]
        - generic [ref=e15]: 前提
      - generic [ref=e16]: →
      - button "大纲" [ref=e17] [cursor=pointer]:
        - img [ref=e19]
        - generic [ref=e21]: 大纲
      - generic [ref=e22]: →
      - button "3 设定" [active] [ref=e23] [cursor=pointer]:
        - generic [ref=e24]: "3"
        - generic [ref=e25]: 设定
      - generic [ref=e26]: →
      - button "4 细纲" [disabled] [ref=e27]:
        - generic [ref=e28]: "4"
        - generic [ref=e29]: 细纲
      - generic [ref=e30]: →
      - button "5 正文" [disabled] [ref=e31]:
        - generic [ref=e32]: "5"
        - generic [ref=e33]: 正文
    - generic [ref=e34]:
      - button "旧版工具" [ref=e35] [cursor=pointer]:
        - img [ref=e36]
      - button "AI 设置" [ref=e40] [cursor=pointer]:
        - img [ref=e41]
  - generic [ref=e56]:
    - tablist [ref=e57]:
      - tab "世界观" [selected] [ref=e58] [cursor=pointer]: 世界观
      - tab "角色" [ref=e60] [cursor=pointer]
      - tab "势力" [ref=e61] [cursor=pointer]
    - generic [ref=e63]:
      - button "+ 添加规则" [ref=e65] [cursor=pointer]:
        - generic [ref=e66]: + 添加规则
      - generic [ref=e68]:
        - generic [ref=e69]: 还没有世界观规则
        - generic [ref=e70]: 点击上方按钮添加第一条规则
    - button "确认设定 ✓" [ref=e72] [cursor=pointer]:
      - generic [ref=e73]: 确认设定 ✓
  - generic [ref=e74]:
    - generic [ref=e75]: 设定 画板
    - textbox "输入指令，AI 将辅助当前画板操作" [ref=e77]
    - button "发送" [disabled] [ref=e78]:
      - generic [ref=e79]: 发送
  - generic [ref=e80]:
    - generic [ref=e82]:
      - img [ref=e83]
      - text: 已保存
    - generic [ref=e85]:
      - generic [ref=e86]: "字数: 0"
      - generic [ref=e87]: "|"
      - generic [ref=e88]: "链接: 0"
```