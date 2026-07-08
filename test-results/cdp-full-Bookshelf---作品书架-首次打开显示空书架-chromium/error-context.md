# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cdp-full.spec.ts >> Bookshelf - 作品书架 >> 首次打开显示空书架
- Location: e2e\cdp-full.spec.ts:55:3

# Error details

```
Test timeout of 60000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - button "书架" [ref=e5] [cursor=pointer]:
      - img [ref=e6]
      - text: 书架
    - generic [ref=e9]: CDP 测试项目
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
  - generic [ref=e76]:
    - img [ref=e80]
    - heading "世界构建入门" [level=2] [ref=e83]
    - paragraph [ref=e84]: 织梦机用「正典」来管理你的设定稳定性。每个设定有四个等级：
    - generic [ref=e85]:
      - generic [ref=e88]:
        - generic [ref=e89]: 未收录
        - generic [ref=e90]: 灵感笔记，尚未确认
      - generic [ref=e93]:
        - generic [ref=e94]: 草案正典
        - generic [ref=e95]: 初步认定，还在打磨
      - generic [ref=e98]:
        - generic [ref=e99]: 项目正典
        - generic [ref=e100]: 团队认可，纳入正典
      - generic [ref=e103]:
        - generic [ref=e104]: 核心正典
        - generic [ref=e105]: 不可更改的基石设定
    - generic [ref=e110]:
      - button "不再显示" [ref=e111] [cursor=pointer]:
        - img [ref=e113]
        - text: 不再显示
      - button "开始使用" [ref=e115] [cursor=pointer]:
        - text: 开始使用
        - img [ref=e116]
```