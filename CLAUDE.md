# CLAUDE.md

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

## 架构

```
app/                  # Next.js App Router
lib/features/         # 功能域模块（ai, config, gitlab, queue, review）
lib/db/               # 数据库（Drizzle + libSQL）
actions/              # Server Actions
components/           # UI 组件
types/                # 类型定义
server.ts             # Custom Server（单例初始化入口）
```

更多：[架构说明](docs/architecture.md)

## Custom Server & Singletons

项目使用 Custom Server (`server.ts`)，所有单例在启动时统一初始化并存储在 `globalThis`：

```typescript
// globalThis 实例（在 server.ts 中初始化）
globalThis.__GITLAB_CLIENT__
globalThis.__REVIEW_ENGINE__
globalThis.__QUEUE_MANAGER__

// 获取单例
await getGitLabClient()
await getReviewEngine()
await getQueueManager()
```

**Docker 构建：** 需复制 `server.ts` 到镜像，`CMD ["bun", "run", "start"]`

## 核心模块

| 模块 | 职责 |
|------|------|
| `lib/features/gitlab` | GitLab API 客户端、diff 解析 |
| `lib/features/review` | 代码审查引擎（AI 分析、评论发布） |
| `lib/features/queue` | 后台任务队列（调度、执行、重试） |
| `lib/features/ai` | AI 提供商注册表（Anthropic、OpenAI、Copilot） |
| `lib/features/config` | 配置加载（数据库存储） |
| `lib/webhooks` | Webhook 事件处理 |

更多：[核心模块详解](docs/modules.md)

## 配置系统

**环境变量**（系统级）：`PORT`、`HOST`、`DATABASE_PATH`

**数据库配置**（业务级）：`gitlab`、`ai`、`review`、`webhook`、`log`、`queue`

```typescript
await getDBConfig()  // 从数据库加载配置
```

更多：[配置说明](docs/configuration.md)

## 开发指南

**Next.js 页面类型** - `params` 和 `searchParams` 是 Promise：

```typescript
import type { PageProps, getStringParam } from '@/types/next';

export default async function Page({ searchParams }: PageProps) {
  const status = await getStringParam(searchParams || {}, 'status');
  return <div>{status}</div>;
}
```

**时区处理** - 使用 `ClientDateTime` 组件：

```typescript
import { ClientDateTime } from '@/components/ui/client-date-time';
<ClientDateTime date={review.createdAt} mode="relative" />
```

更多：[开发指南](docs/development.md)

## 代码风格

- **注释：** 保持最少，除非必要不添加 JSDoc 或行内注释
- **导入：** `@/types/*`、`@/lib/features/*`、`@/actions/*`、`@/components/*`、`@/lib/db`
- **日志：** 使用 Pino `createLogger('module-name')`

## 参考资料

- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Drizzle ORM](https://orm.drizzle.team)
- [Next.js App Router](https://nextjs.org/docs/app)
