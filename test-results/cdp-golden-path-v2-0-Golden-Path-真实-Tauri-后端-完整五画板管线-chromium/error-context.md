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
      - button "1 前提" [ref=e11] [cursor=pointer]:
        - generic [ref=e12]: "1"
        - generic [ref=e13]: 前提
      - generic [ref=e14]: →
      - button "2 大纲" [disabled] [ref=e15]:
        - generic [ref=e16]: "2"
        - generic [ref=e17]: 大纲
      - generic [ref=e18]: →
      - button "3 设定" [disabled] [ref=e19]:
        - generic [ref=e20]: "3"
        - generic [ref=e21]: 设定
      - generic [ref=e22]: →
      - button "4 细纲" [disabled] [ref=e23]:
        - generic [ref=e24]: "4"
        - generic [ref=e25]: 细纲
      - generic [ref=e26]: →
      - button "5 正文" [disabled] [ref=e27]:
        - generic [ref=e28]: "5"
        - generic [ref=e29]: 正文
    - generic [ref=e30]:
      - button "旧版工具" [ref=e31] [cursor=pointer]:
        - img [ref=e32]
      - button "AI 设置" [ref=e36] [cursor=pointer]:
        - img [ref=e37]
  - generic [ref=e52]:
    - generic [ref=e53]:
      - generic [ref=e54]: 前提卡
      - generic [ref=e55]: 用一段话讲清楚你的故事核心。这是整个作品的根基。
    - generic [ref=e56]:
      - generic [ref=e57]: 好前提的公式
      - generic [ref=e58]: 一个关于「人物」的故事，他/她想要「目标」，但是「障碍」阻挡了他/她，否则「后果」不可挽回。
      - generic [ref=e59]: 示例：一个科幻故事，关于一个被遗弃在火星上的宇航员，他想要回到地球，但是他的资源正在耗尽，否则他将永远困在红色荒漠中。
    - generic [ref=e60]:
      - generic [ref=e61]: 前提文本如果一个__遇到了____，会发生什么？
      - textbox "如果一个被遗弃在火星上的宇航员遇到了地球不再派遣救援的困境，会发生什么？" [active] [ref=e62]: 一个渴望掌控权力的王子，在政变中失去一切，必须带领乌合之众在边疆求生。
    - generic [ref=e63]:
      - generic [ref=e64]: 故事类型选择故事的核心驱动
      - combobox [ref=e66] [cursor=pointer]:
        - option "选择类型" [selected]
        - option "高概念"
        - option "深挖"
        - option "人物驱动"
        - option "世界观驱动"
    - generic [ref=e67]:
      - generic [ref=e68]: 读者问题每行一条，读者在阅读中想解答的问题（换行分隔）
      - textbox "这个世界的规则是什么？ 主角为什么要冒险？ 最大的悬念是什么？" [ref=e69]:
        - /placeholder: "这个世界的规则是什么？\n主角为什么要冒险？\n最大的悬念是什么？"
    - generic [ref=e70]:
      - button "保存草稿" [ref=e71] [cursor=pointer]:
        - generic [ref=e72]: 保存草稿
      - button "确认前提" [ref=e73] [cursor=pointer]:
        - generic [ref=e74]: 确认前提
  - generic [ref=e75]:
    - generic [ref=e76]: 前提 画板
    - textbox "输入指令，AI 将辅助当前画板操作" [ref=e78]
    - button "发送" [disabled] [ref=e79]:
      - generic [ref=e80]: 发送
  - generic [ref=e81]:
    - generic [ref=e83]:
      - img [ref=e84]
      - text: 已保存
    - generic [ref=e86]:
      - generic [ref=e87]: "字数: 0"
      - generic [ref=e88]: "|"
      - generic [ref=e89]: "链接: 0"
  - generic [ref=e91]:
    - img [ref=e95]
    - heading "世界构建入门" [level=2] [ref=e98]
    - paragraph [ref=e99]: 织梦机用「正典」来管理你的设定稳定性。每个设定有四个等级：
    - generic [ref=e100]:
      - generic [ref=e103]:
        - generic [ref=e104]: 未收录
        - generic [ref=e105]: 灵感笔记，尚未确认
      - generic [ref=e108]:
        - generic [ref=e109]: 草案正典
        - generic [ref=e110]: 初步认定，还在打磨
      - generic [ref=e113]:
        - generic [ref=e114]: 项目正典
        - generic [ref=e115]: 团队认可，纳入正典
      - generic [ref=e118]:
        - generic [ref=e119]: 核心正典
        - generic [ref=e120]: 不可更改的基石设定
    - generic [ref=e125]:
      - button "不再显示" [ref=e126] [cursor=pointer]:
        - img [ref=e128]
        - text: 不再显示
      - button "开始使用" [ref=e130] [cursor=pointer]:
        - text: 开始使用
        - img [ref=e131]
```