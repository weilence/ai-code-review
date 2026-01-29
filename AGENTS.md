# AI 代码审查系统

AI 驱动的 GitLab 代码审查系统，通过 Webhook 自动触发 AI 代码审查。Next.js 16 + React 19 + Bun。

## 常用命令

```bash
bun run dev          # 启动开发服务器
bun run build        # 构建生产版本
bun run start        # 启动生产服务器
bun run typecheck    # TypeScript 类型检查
bun run db:push      # 推送 schema 到数据库
bun run db:studio    # 打开 Drizzle Studio
```

## 项目架构

```
app/                  # Next.js App Router
lib/features/         # 功能域模块（ai, config, gitlab, queue, review）
lib/db/               # 数据库（Drizzle + libSQL）
actions/              # Server Actions
components/           # UI 组件
types/                # 类型定义
server.ts             # Custom Server（单例初始化入口）
```

## 核心模块

| 模块 | 职责 |
|------|------|
| `lib/db/` | 数据库（Drizzle + libSQL） |
| `lib/features/gitlab` | GitLab API 客户端、diff 解析 |
| `lib/features/review` | 代码审查引擎（AI 分析、评论发布） |
| `lib/features/queue` | 后台任务队列（调度、执行、重试） |
| `lib/features/ai` | AI 提供商注册表（Anthropic、OpenAI、Copilot） |
| `lib/features/config` | 配置加载（数据库存储） |
| `lib/webhooks` | Webhook 事件处理 |

## 配置系统

- **环境变量**（系统级）：`PORT`、`HOST`、`DATABASE_PATH`
- **数据库配置**（业务级）：`gitlab`、`ai`、`review`、`webhook`、`log`、`queue`

## 详细文档

- [架构说明](docs/architecture.md) - 技术栈、目录结构、架构层次
- [核心模块](docs/modules.md) - ReviewEngine、AI 注册表、Webhook、队列系统
- [配置说明](docs/configuration.md) - 配置职责分离、AI 模型配置、Custom Server
- [开发指南](docs/development.md) - 添加新功能、Next.js 类型、时区处理、代码风格

## 队列系统

任务队列使用数据库事务保证并发安全：

- `enqueue()` - 使用 `INSERT WHERE NOT EXISTS` 避免重复任务
- `dequeue()` - 使用事务原子性地获取和锁定任务
- 所有操作在同一事务内完成，防止并发冲突
