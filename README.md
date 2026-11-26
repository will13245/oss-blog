# oss-blog —— 可注册、可写作、可评论、可搜索的个人博客系统

《开源软件与新技术》实验 1：以成熟开源项目为基线的个人博客系统二次开发。

- 上游基线：[TryGhost/Ghost](https://github.com/TryGhost/Ghost)（MIT License）
- 规范参考：[realworld-apps/realworld](https://github.com/realworld-apps/realworld)
- 自主开发范围：自定义主题 `theme/oss-blog-theme`（相关推荐、搜索高亮等），**不修改 Ghost 核心**

> 详细内容完善中，最终交付前补齐：安装步骤、Demo 流程、测试结果、差异清单。

## 目录结构

```
openblog/
├── docs/        # 基线记录、架构图、Issue 记录
├── theme/       # 自定义主题源码（oss-blog-theme）
├── tests/       # 验收测试用例与自动化测试
├── scripts/     # 演示数据生成、备份恢复脚本
└── runtime/     # Ghost 运行目录（不入库，见 .gitignore）
```
