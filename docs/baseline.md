# 上游基线记录（Baseline）

> 记录日期：2026-11-26　|　负责人：本人独立完成

## 固定版本

| 组件 | 版本 | 记录命令 |
| --- | --- | --- |
| Ghost | 5.130.6（本地安装，固定 Release） | `ghost ls` |
| Ghost CLI | 1.34.1 | `ghost --version` |
| Node.js | v22.23.2 | `node --version` |
| npm | 10.9.8 | `npm --version` |
| Git | 2.49.0.windows.1 | `git --version` |
| 数据库 | SQLite3 5.1.7（Ghost 内置依赖） | `runtime/content/data/ghost-local.db` |

## 版本选择说明

- 最新 Ghost 6.78.0 要求 Node `^22.23.5 || ^24.22.3`，与本机 Node 22.23.2 不兼容。
- 为避免改动系统全局 Node 版本（影响其他项目），选择固定 Ghost **5.130.6**（5.x 最终稳定版），
  其 engines 范围 `^18.12.1 || ^20.11.1 || ^22.13.1` 完全覆盖本机 Node 版本。
- 版本已固定，重复安装命令：`ghost install 5.130.6 --local --no-stack`（见 README）。

## 安装过程中的问题与解决（真实记录）

1. **Ghost 6.78.0 Node 兼容检查失败** → 固定 5.130.6（见上）。
2. **"Python is required for SQLite3" 检查失败**：Windows 无 `python3` 命令（Microsoft Store shim 失效）。
   在 `C:\Users\super\AppData\Local\pnpm`（PATH 内）放置 `python3.exe`（复制自 Python 3.11.4）解决。
3. **sqlite3 optional 依赖被静默跳过**：npm/yarn 下载预编译二进制失败时 optionalDependencies 不报错。
   手动补装：`npm install sqlite3@5.1.7 --no-save --legacy-peer-deps --ignore-scripts`，
   再从 [TryGhost/node-sqlite3 v5.1.7 release](https://github.com/TryGhost/node-sqlite3/releases/tag/v5.1.7)
   下载 `sqlite3-v5.1.7-napi-v6-win32-x64.tar.gz`，将 `build/Release/node_sqlite3.node`
   放入 `node_modules/sqlite3/lib/binding/node-v127-win32-x64/`（Node 22 的 ABI 为 127）。

## 基线功能清单（未做任何二次开发前）

| # | 功能 | 结果 | 说明 |
| --- | --- | --- | --- |
| 1 | 前台访问 http://localhost:2368/ | ✅ HTTP 200 | 默认主题 Casper |
| 2 | 管理端 /ghost 可访问 | ✅ HTTP 200 | 待完成管理员初始化 |
| 3 | 管理员创建/发布文章 | 待验证 | 初始化后补录 |
| 4 | 标签管理 | 待验证 | 初始化后补录 |
| 5 | 会员注册（门户） | 待验证 | 初始化后补录 |
| 6 | 评论（会员身份） | 待验证 | 初始化后补录 |
| 7 | 原生搜索入口 | 待验证 | 初始化后补录 |
| 8 | 重启后数据保留 | 待验证 | `ghost stop` + `ghost start` 后补录 |

## 修改边界（约定）

- **允许修改**：`theme/oss-blog-theme/`（自定义主题）、`scripts/`、`tests/`、`docs/`、仓库根配置。
- **禁止修改**：Ghost 核心（`runtime/versions/`）、Ghost 内置主题、数据库结构。
- **不入库**：`runtime/` 整个目录（数据库、日志、密钥、上传文件），见 `.gitignore`。
