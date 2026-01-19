# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个 AI 驱动的 GitLab 代码审查系统，通过 Webhook 自动触发 AI 代码审查。当前项目正在从旧的 monorepo 架构（位于 `old/` 目录）迁移到 Next.js 16 + React 19 的统一架构。

### 核心功能

1. **GitLab Webhook 集成** - 监听 MR 事件、Push 事件和 Note 命令
2. **多 AI 提供商支持** - Anthropic Claude、OpenAI、GitHub Copilot、OpenAI 兼容 API
3. **代码审查引擎** - 分析代码变更，生成内联评论和审查摘要
4. **配置管理** - 支持环境变量和数据库两种配置方式
5. **审查历史与失败追踪** - 完整的审查记录和错误追踪

## 常用命令

### 当前 Next.js 项目

```bash
# 安装依赖
bun install

# 开发模式
bun run dev

# 构建项目
bun run build

# 生产运行
bun run start

# 代码检查
bun run lint
```

### 旧项目（位于 old/ 目录）

```bash
# 开发模式（同时启动前后端）
bun run dev

# 仅启动后端
bun run dev:backend

# 仅启动前端
bun run dev:frontend

# 代码检查
bun run lint
bun run lint:fix

# 类型检查
bun run typecheck

# 数据库操作
bun run db:generate    # 生成数据库迁移
bun run db:push        # 推送数据库变更
bun run db:seed        # 种子数据
```

## 架构说明

### 旧项目架构（old/）

```
old/
├── backend/           # Hono HTTP 服务器
│   ├── src/
│   │   ├── ai/        # AI 集成层（提供商注册表、Agent 生成）
│   │   ├── api/       # REST API 路由
│   │   ├── config/    # 配置系统（环境变量 + 数据库）
│   │   ├── db/        # Drizzle ORM + SQLite
│   │   ├── gitlab/    # GitLab API 客户端
│   │   ├── graphql/   # GraphQL API
│   │   ├── review/    # 代码审查引擎
│   │   ├── webhooks/  # Webhook 处理器
│   │   └── services/  # 业务服务层
├── frontend/          # React + Vite 前端
│   └── src/
│       ├── components/
│       ├── routes/    # TanStack Router 页面
│       └── hooks/
└── shared/            # 共享类型和工具
```

### 新项目架构（当前根目录）

**目录组织（Feature-Based）：**

```
app/                    # Next.js App Router
├── (dashboard)/        # Dashboard 路由组
│   ├── reviews/       # 审查管理页面
│   ├── settings/      # 配置管理页面
│   └── webhooks/      # Webhook 日志页面
└── api/               # API 路由
    ├── webhook/       # GitLab Webhook 处理
    └── health/        # 健康检查

lib/
├── features/          # 功能域模块（核心业务逻辑）
│   ├── review/        # 审查引擎
│   ├── gitlab/        # GitLab 集成
│   ├── config/        # 配置管理
│   └── ai/            # AI 提供商
├── db/                # 数据库访问层
├── services/          # 服务层（单例管理）
├── webhooks/          # Webhook 处理器
└── utils/             # 工具函数

actions/               # Server Actions（应用层）
├── review.ts          # 审查操作
├── gitlab.ts          # GitLab 操作
├── config.ts          # 配置操作
└── webhook.ts         # Webhook 操作

components/            # UI 组件
├── ui/               # 基础组件
├── layout/           # 布局组件
└── ...

types/                # 类型定义（统一管理）
├── review.ts         # 审查类型
├── gitlab.ts         # GitLab 类型
├── config.ts         # 配置类型
└── ai.ts             # AI 类型
```

**架构层次：**

1. **Presentation Layer** - `app/` + `components/`
   - Next.js 页面和 UI 组件
   - 零客户端 JavaScript（服务端组件优先）

2. **Application Layer** - `actions/`
   - Server Actions 处理用户交互
   - 调用 Domain Layer 的功能模块

3. **Domain Layer** - `lib/features/`
   - 核心业务逻辑
   - 按功能域组织（review、gitlab、config、ai）

4. **Infrastructure Layer** - `lib/db/` + `lib/utils/`
   - 数据库访问
   - 通用工具函数

**技术栈：**
- **Next.js 16.1.3** - App Router 架构
- **React 19.2.3** - UI 框架
- **Tailwind CSS v4** - 样式框架
- **TypeScript** - 类型系统
- **Drizzle ORM** - 数据库 ORM
- **Vercel AI SDK** - AI 集成

## 核心模块详解

### 1. 代码审查引擎 (`old/backend/src/review/engine.ts`)

**ReviewEngine** 类是核心组件，负责：

- 解析 GitLab MR 的 diff 变更
- 调用 AI 分析代码（使用 Vercel AI SDK）
- 发布内联评论和摘要评论到 GitLab
- 设置 GitLab Commit Status
- 管理审查生命周期（pending → running → completed/failed）

**关键方法：**
- `reviewMergeRequest()` - 执行完整的审查流程
- `parseChanges()` - 解析 diff 为结构化数据
- `postInlineComment()` - 发布单条内联评论
- `cleanupOldComments()` - 清理旧的 AI 评论

### 2. AI 提供商注册表 (`old/backend/src/ai/registry.ts`)

**AICodeReviewRegistry** 使用 Vercel AI SDK 的 `createProviderRegistry()` 统一管理多个 AI 提供商：

- **Anthropic**: Claude 模型
- **OpenAI**: GPT 模型
- **GitHub Copilot**: 通过自定义客户端（需要 OAuth token）
- **OpenAI Compatible**: 兼容 OpenAI API 的第三方服务

**模型 ID 格式：** `provider:model-name`（例如 `anthropic:claude-sonnet-4-5`）

### 3. 配置系统 (`old/backend/src/config/`)

**优先级：** 数据库配置 > 环境变量

**配置类别：**
- `gitlab` - GitLab URL、Token、Webhook Secret
- `ai` - AI 提供商配置、模型选择
- `webhook` - 事件类型、触发条件
- `review` - 审查规则（文件限制、语言、失败行为）
- `log` - 日志级别

**热重载：** 配置变更通过数据库监听自动生效，无需重启。

### 4. Webhook 处理 (`old/backend/src/webhooks/`)

**事件处理器：**
- `merge-request.ts` - MR 打开/更新事件
- `note.ts` - MR 评论命令（`/review`、`/ai-review`）
- `push.ts` - Push 事件（可选）

**验证：** 通过 `X-Gitlab-Token` header 验证 webhook 签名。

### 5. 数据库 Schema (`old/backend/src/db/schema.ts`)

使用 **Drizzle ORM** + **SQLite**：

- `reviews` - 审查记录主表
- `reviewResults` - 审查结果（JSON 存储）
- `reviewErrors` - 审查错误日志
- `webhooks` - Webhook 事件日志
- `settings` - 配置数据

**索引：** 在 `projectId + mrIid`、`status`、`createdAt` 等字段上建立索引。

### 6. GitLab 客户端 (`old/backend/src/gitlab/client.ts`)

使用 **@gitbeaker/rest** 封装 GitLab API：

- `getMergeRequestChanges()` - 获取 MR 变更
- `postNote()` / `updateNote()` - 发布/更新评论
- `postInlineComment()` - 发布内联评论
- `setCommitStatus()` - 设置提交状态
- `getDiscussions()` - 获取讨论列表

## 数据流

### 典型的代码审查流程

```
GitLab Webhook
    ↓
Hono 服务器 (/webhook)
    ↓
验证签名 + 事件类型
    ↓
创建 reviews 记录（status: running）
    ↓
调用 ReviewEngine.reviewMergeRequest()
    ↓
获取 MR 变更 → 解析 diff
    ↓
过滤可审查文件（根据配置）
    ↓
调用 AI 分析（Vercel AI SDK）
    ↓
生成内联评论 + 摘要
    ↓
发布到 GitLab（评论 + Commit Status）
    ↓
保存结果到 reviewResults
    ↓
更新 reviews 状态（completed/failed）
```

## 迁移指南

### 后端迁移（Hono → Next.js API Routes）

**映射关系：**

| Hono | Next.js API Routes |
|------|-------------------|
| `app.post('/webhook', ...)` | `app/api/webhook/route.ts` |
| `app.route('/api/review', ...)` | `app/api/review/[...]/route.ts` |
| `app.route('/auth', ...)` | `app/api/auth/[...]/route.ts` |
| `graphqlRoute` | `app/api/graphql/route.ts` |

**关键改动：**
1. 使用 `NextRequest` / `NextResponse` 替代 Hono 的 `Context`
2. 移除 `serveStatic` 中间件（Next.js 自动处理）
3. 数据库客户端改为 Next.js 的单例模式
4. AI SDK 保持不变（Vercel AI SDK 与 Next.js 原生兼容）

### 前端迁移（TanStack Router → Next.js App Router）

**映射关系：**

| TanStack Router | Next.js App Router |
|----------------|-------------------|
| `routes/settings/index.tsx` | `app/settings/page.tsx` |
| `createRoute({ ... })` | 文件系统路由 |
| `useLoaderData()` | 服务端组件直接获取 / `useSuspenseQuery()` |
| `useNavigate()` | `router.push()` / `<Link>` |

**关键改动：**
1. GraphQL 客户端改为 `fetch` 或 React Query
2. TanStack Query 的 `useQuery()` 在 Next.js 中可继续使用
3. 服务端组件优先，减少客户端 JS
4. Radix UI 组件保持不变

### 共享代码迁移

**保持不变：**
- `shared/src/types/` - 直接复制到 `src/types/`
- `shared/src/utils/` - 直接复制到 `src/utils/`
- `shared/src/config/` - 复制到 `src/config/`

**依赖处理：**
- Zod schemas 直接迁移
- 日期/URL 解析工具直接使用

### 新架构最佳实践

**导入规则：**
- 从 `@/types/*` 导入类型定义
- 从 `@/lib/features/*` 导入业务逻辑
- 从 `@/actions/*` 导入 Server Actions
- 从 `@/components/*` 导入 UI 组件

**添加新功能：**
1. 在 `lib/features/your-feature/` 创建业务逻辑
2. 在 `actions/your-feature.ts` 创建 Server Actions
3. 在 `components/your-feature/` 创建 UI 组件
4. 在 `app/(dashboard)/your-feature/` 创建页面

**示例：添加通知功能**

```typescript
// lib/features/notify/notify.ts
export class Notifier {
  send(message: string) { /* ... */ }
}

// actions/notify.ts
'use server';
import { getNotifier } from '@/lib/features/notify';
export async function sendNotification(msg: string) {
  const notifier = getNotifier();
  return notifier.send(msg);
}

// components/notify/notification-panel.tsx
'use client';
import { sendNotification } from '@/actions/notify';
export function NotificationPanel() { /* ... */ }
```

**Feature 模块导出约定：**
每个 feature 模块应包含 `index.ts` 导出文件：
```typescript
// lib/features/example/index.ts
export { ExampleClass } from './class';
export { helperFunction } from './helpers';
export type { ExampleType } from './types';
```

## 重要配置

### 环境变量示例（旧项目）

```bash
# 服务器
PORT=3000
HOST=0.0.0.0

# GitLab
GITLAB_URL=https://gitlab.com
GITLAB_TOKEN=glpat-xxx
GITLAB_WEBHOOK_SECRET=your-secret

# AI 提供商
AI_MODELS=anthropic:claude-sonnet-4-5
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx
```

### Webhook 配置

**GitLab Webhook URL：** `https://your-domain.com/webhook`

**触发事件：**
- Merge Request events
- Comments
- Push events（可选，需配置分支）

**验证 Token：** 设置 `GITLAB_WEBHOOK_SECRET` 环境变量，并在 GitLab Webhook 配置中使用相同的 Secret Token。

## 开发注意事项

### AI 模型选择

- **默认模型：** `anthropic:claude-sonnet-4-5`
- **配置格式：** `provider:model-id`
- **多模型支持：** 使用逗号分隔（`AI_MODELS=model1,model2`）

### 审查规则

- **文件过滤：** `skipFiles` 支持通配符（`*.lock`, `*.min.js`）
- **文件限制：** `maxFiles`（默认 50）、`maxLinesPerFile`（默认 1000）
- **失败阈值：** `failureThreshold` 设置最低严重级别（critical > major > minor > suggestion）
- **失败行为：** `blocking`（阻止合并）或 `non-blocking`

### 日志系统

使用 **Pino** 日志库：

```typescript
import { createLogger } from './utils/logger';

const logger = createLogger('module-name');
logger.info({ key: 'value' }, 'Message');
```

**日志级别：** `trace` < `debug` < `info` < `warn` < `error`

### 错误处理

**自定义错误类型：**
- `AppError` - 通用应用错误
- `WebhookVerificationError` - Webhook 验证失败
- `GitLabAPIError` - GitLab API 错误

**错误追踪：** 所有审查错误保存到 `reviewErrors` 表，包含堆栈跟踪和重试标志。

## 依赖版本

### 关键依赖

```json
{
  "ai": "^6.0.26",                    // Vercel AI SDK
  "@ai-sdk/anthropic": "^3.0.9",
  "@ai-sdk/openai": "^3.0.7",
  "drizzle-orm": "^0.45.1",           // ORM
  "better-sqlite3": "^12.6.2",        // SQLite 驱动
  "@gitbeaker/rest": "^43.8.0",       // GitLab API
  "hono": "^4.11.3",                  // HTTP 框架（旧）
  "zod": "^4.3.5",                    // 验证
  "pino": "^10.1.0"                   // 日志
}
```

### Next.js 依赖（新）

```json
{
  "next": "16.1.3",
  "react": "19.2.3",
  "react-dom": "19.2.3",
  "tailwindcss": "^4"
}
```

## 参考资料

- **Vercel AI SDK:** https://sdk.vercel.ai/docs
- **Drizzle ORM:** https://orm.drizzle.team
- **GitLab Webhooks:** https://docs.gitlab.com/ee/user/project/integrations/webhooks.html
- **Next.js App Router:** https://nextjs.org/docs/app
