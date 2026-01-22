# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个 AI 驱动的 GitLab 代码审查系统，通过 Webhook 自动触发 AI 代码审查。使用 Next.js 16 + React 19 构建，采用 Feature-Based 架构组织代码。

### 核心功能

1. **GitLab Webhook 集成** - 监听 MR 事件、Push 事件和 Note 命令
2. **多 AI 提供商支持** - Anthropic Claude、OpenAI、GitHub Copilot、OpenAI 兼容 API
3. **代码审查引擎** - 分析代码变更，生成内联评论和审查摘要
4. **配置管理** - 环境变量配置系统参数（port、host），数据库配置业务逻辑（GitLab、AI、Review 等）
5. **审查历史与失败追踪** - 完整的审查记录和错误追踪

## 常用命令

```bash
# 开发
bun install              # 安装依赖
bun run dev              # 启动开发服务器
bun run build            # 构建生产版本
bun run start            # 启动生产服务器
bun run lint             # 代码检查
bun run typecheck        # TypeScript 类型检查

# 数据库操作
bun run db:generate      # 生成数据库迁移
bun run db:push          # 推送 schema 到数据库
bun run db:studio        # 打开 Drizzle Studio（可视化数据库）
bun run db:seed          # 运行种子数据脚本
```

## 架构说明

### 技术栈

- **Next.js 16.1.3** - App Router 架构
- **React 19.2.3** - UI 框架
- **Bun + SQLite** - 运行时和数据库
- **Drizzle ORM** - 数据库 ORM
- **Vercel AI SDK** - AI 集成
- **Tailwind CSS v4** - 样式框架
- **Pino** - 日志系统
- **Zod** - Schema 验证

### 目录结构

```
app/                      # Next.js App Router
├── (dashboard)/          # Dashboard 路由组
│   ├── reviews/          # 审查管理页面
│   ├── settings/         # 配置管理页面
│   └── webhooks/         # Webhook 日志页面
└── api/                   # API 路由
    ├── webhook/          # GitLab Webhook 处理
    ├── health/           # 健康检查
    ├── config/           # 配置 API
    └── review/           # 审查操作 API

lib/
├── features/             # 功能域模块（核心业务逻辑）
│   ├── ai/               # AI 提供商注册表和模型管理
│   ├── config/           # 配置加载和管理
│   ├── gitlab/           # GitLab API 客户端和 diff 解析
│   └── review/           # 代码审查引擎
├── db/                   # 数据库访问层（Drizzle + SQLite）
├── webhooks/             # Webhook 处理器
├── utils/                # 工具函数
└── constants.ts          # 常量定义

actions/                  # Server Actions（应用层）
├── review.ts             # 审查操作
├── gitlab.ts             # GitLab 操作
├── config.ts             # 配置操作
└── webhook.ts            # Webhook 操作

components/               # UI 组件
├── ui/                   # 基础组件
└── layout/               # 布局组件

types/                    # 类型定义
├── next.ts               # Next.js 页面类型（PageProps、getStringParam 等）
├── review.ts             # 审查相关类型
├── gitlab.ts             # GitLab 相关类型
├── config.ts             # 配置相关类型
└── ai.ts                 # AI 相关类型
```

### 架构层次

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

## 核心模块详解

### 1. 功能域单例模式（Feature-Based Singletons）

**重要架构决策：** 在 Next.js 环境中使用单例模式避免重复初始化。遵循 Feature-Based 架构，每个功能模块管理自己的单例。

```typescript
// lib/features/review/singleton.ts
export async function getReviewEngine(): Promise<ReviewEngine>
export function resetReviewEngine(): void  // 用于测试

// lib/features/gitlab/singleton.ts
export async function getGitLabClient(): Promise<GitLabClient>
export function resetGitLabClient(): void  // 用于测试
```

**使用场景：**
- 在 Server Actions 或 API Routes 中调用
- 自动延迟初始化，只在首次使用时创建
- 配置变更后需要重启服务器以重新加载

### 2. 配置系统（`lib/features/config/`）

**配置职责分离：**
- **环境变量**：系统级参数（`port`、`host`），用于 Next.js 服务器启动
- **数据库**：业务配置（GitLab、AI、Review、Webhook、Log 等），支持动态更新

**配置类别：**
- `gitlab` - GitLab URL、Token、Webhook Secret
- `ai` - AI 提供商配置、模型选择（支持多个模型配置）
- `webhook` - 事件类型、触发条件
- `review` - 审查规则（文件限制、语言、失败行为）
- `log` - 日志级别

**配置加载流程：**
```typescript
// 1. 从环境变量加载系统配置（port、host）
const systemConfig = loadSystemConfigFromEnv();

// 2. 从数据库加载业务配置
const dbConfig = await loadConfigFromDB();

// 3. 合并配置
const finalConfig = mergeConfig(dbConfig, systemConfig);
```

**AI 模型配置格式：**
```typescript
{
  "models": {
    "anthropic:claude-sonnet-4-5": {
      "provider": "anthropic",
      "apiKey": "sk-ant-xxx",
      "temperature": 0.5
    },
    "openai:gpt-4": {
      "provider": "openai",
      "apiKey": "sk-xxx",
      "baseUrl": "https://api.openai.com/v1"
    }
  }
}
```

### 3. 代码审查引擎（`lib/features/review/`）

**ReviewEngine 类**是核心组件，负责：

- 解析 GitLab MR 的 diff 变更
- 调用 AI 分析代码（使用 Vercel AI SDK）
- 发布内联评论和摘要评论到 GitLab
- 设置 GitLab Commit Status
- 管理审查生命周期（pending → running → completed/failed）

**关键方法：**
- `reviewMergeRequest()` - 执行完整的审查流程
- `parseChanges()` - 解析 diff 为结构化数据
- `postInlineComment()` - 发布单条内联评论
- `cleanupOldComments()` - 清理旧的 AI 评论（使用 AI_COMMENT_MARKER 标识）

**审查流程：**
```
1. 创建 reviews 记录（status: running）
2. 获取 MR 变更 → 解析 diff
3. 过滤可审查文件（根据配置的 skipFiles、maxFiles、maxLinesPerFile）
4. 调用 AI 分析（分文件或分批）
5. 生成内联评论 + 摘要
6. 发布到 GitLab（评论 + Commit Status）
7. 保存结果到 reviewResults
8. 更新 reviews 状态（completed/failed）
```

### 4. AI 提供商注册表（`lib/features/ai/`）

**AICodeReviewRegistry** 使用 Vercel AI SDK 的 `createProviderRegistry()` 统一管理多个 AI 提供商：

- **Anthropic**: Claude 模型
- **OpenAI**: GPT 模型
- **GitHub Copilot**: 通过自定义客户端（需要 OAuth token）
- **OpenAI Compatible**: 兼容 OpenAI API 的第三方服务

**模型 ID 格式：** `provider:model-name`（例如 `anthropic:claude-sonnet-4-5`）

**特殊配置：**
- GitHub Copilot 需要额外的 `CopilotTokenStorage` 来管理 OAuth token
- 支持 OpenAI 兼容 API（通过 `baseUrl` 自定义）

### 5. Webhook 处理（`lib/webhooks/`）

**事件处理器：**
- `merge-request.ts` - MR 打开/更新事件
- `note.ts` - MR 评论命令（`/review`、`/ai-review`）
- `push.ts` - Push 事件（可选）

**验证：** 通过 `X-Gitlab-Token` header 验证 webhook 签名。

**处理流程：**
```
1. 验证签名（X-Gitlab-Token）
2. 解析事件类型（X-Gitlab-Event）
3. 保存 webhook 事件到数据库
4. 根据事件类型分发到对应处理器
5. 处理器调用 ReviewEngine
```

### 6. 数据库 Schema（`lib/db/schema.ts`）

使用 **Drizzle ORM** + **bun-sqlite**：

- `reviews` - 审查记录主表（包含状态、耗时、重试次数）
- `reviewResults` - 审查结果（JSON 存储内联评论和摘要）
- `reviewErrors` - 审查错误日志（支持重试标识）
- `webhooks` - Webhook 事件日志
- `settings` - 配置数据（Key-Value 格式）

**索引：** 在 `projectId + mrIid`、`status`、`createdAt` 等字段上建立索引。

**数据库优化：**
```typescript
// lib/db/index.ts
PRAGMA journal_mode = WAL;      // 写前日志
PRAGMA foreign_keys = ON;       // 外键约束
PRAGMA synchronous = NORMAL;    // 同步模式
```

**数据库位置：** 用户数据目录（跨平台）
- Linux: `~/.local/share/ai-code-review/ai-code-review.db`
- macOS: `~/Library/Application Support/ai-code-review/ai-code-review.db`
- Windows: `%APPDATA%\ai-code-review\ai-code-review.db`
- 可通过环境变量 `DATABASE_PATH` 自定义

## Next.js 页面类型规范

**重要：** Next.js 15+ 中，`params` 和 `searchParams` 都是 **Promise**，必须 `await` 才能获取值。

**统一使用项目中的类型定义**（types/next.ts）：

```typescript
import type { PageProps, getStringParam } from '@/types/next';

export default async function ReviewsPage({ searchParams }: PageProps) {
  // 使用辅助函数获取参数（自动处理数组情况）
  const status = await getStringParam(searchParams || {}, 'status');

  return <div>筛选: {status}</div>
}
```

**动态路由：**
```typescript
import type { DynamicPageProps } from '@/types/next';

type DetailPageParams = { id: string };

export default async function DetailPage({
  params
}: DynamicPageProps<DetailPageParams>) {
  const { id } = await params;
  return <div>ID: {id}</div>
}
```

**布局文件：**
```typescript
import type { LayoutProps } from '@/types/next';

export default async function DashboardLayout({
  children,
  params
}: LayoutProps) {
  return <div>{children}</div>;
}
```

详见：[EXAMPLES-NEXT-PAGE-TYPES.md](EXAMPLES-NEXT-PAGE-TYPES.md)

## 开发指南

### 添加新功能

**标准流程：**
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

// app/(dashboard)/notifications/page.tsx
import type { PageProps } from '@/types/next';
import { sendNotification } from '@/actions/notify';

export default async function NotificationsPage(props: PageProps) {
  return <div>...</div>;
}
```

**Feature 模块导出约定：**
每个 feature 模块应包含 `index.ts` 导出文件：
```typescript
// lib/features/example/index.ts
export { ExampleClass } from './class';
export { helperFunction } from './helpers';
export type { ExampleType } from './types';
```

### 导入规则

- 从 `@/types/*` 导入类型定义
- 从 `@/lib/features/*` 导入业务逻辑
- 从 `@/lib/features/*/singleton` 导入功能域单例
- 从 `@/actions/*` 导入 Server Actions
- 从 `@/components/*` 导入 UI 组件
- 从 `@/lib/db` 导入数据库客户端和 schema

### 日志系统

使用 **Pino** 日志库：

```typescript
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('module-name');
logger.info({ key: 'value' }, 'Message');
```

**日志级别：** `trace` < `debug` < `info` < `warn` < `error`

### 错误处理

**审查错误处理：**
- 所有审查错误保存到 `reviewErrors` 表
- 包含错误类型、消息、堆栈跟踪
- 支持重试标识（`retryable` 字段）

**自定义错误类型（旧项目）：**
- `AppError` - 通用应用错误
- `WebhookVerificationError` - Webhook 验证失败
- `GitLabAPIError` - GitLab API 错误

### AI 模型选择

- **配置格式：** `provider:model-id`
- **多模型支持：** 在配置中添加多个模型，使用 `provider:model-id` 作为 key
- **默认模型：** ReviewEngine 使用配置中的第一个模型

### 审查规则

- **文件过滤：** `skipFiles` 支持通配符（`*.lock`, `*.min.js`）
- **文件限制：** `maxFiles`（默认 50）、`maxLinesPerFile`（默认 1000）
- **失败阈值：** `failureThreshold` 设置最低严重级别（critical > major > minor > suggestion）
- **失败行为：** `blocking`（阻止合并）或 `non-blocking`

## 旧项目架构（old/ 目录）

旧项目使用 Hono + React + Vite，正在迁移到 Next.js。

**映射关系：**

| Hono | Next.js API Routes |
|------|-------------------|
| `app.post('/webhook', ...)` | `app/api/webhook/route.ts` |
| `app.route('/api/review', ...)` | `app/api/review/[...]/route.ts` |

| TanStack Router | Next.js App Router |
|----------------|-------------------|
| `routes/settings/index.tsx` | `app/settings/page.tsx` |
| `createRoute({ ... })` | 文件系统路由 |

## 环境变量示例

```bash
# GitLab
GITLAB_URL=https://gitlab.com
GITLAB_TOKEN=glpat-xxx
GITLAB_WEBHOOK_SECRET=your-secret

# AI 提供商
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx

# GitHub Copilot（可选）
COPILOT_TOKEN_PATH=./data/copilot-token.json
```

## 参考资料

- **Vercel AI SDK:** https://sdk.vercel.ai/docs
- **Drizzle ORM:** https://orm.drizzle.team
- **GitLab Webhooks:** https://docs.gitlab.com/ee/user/project/integrations/webhooks.html
- **Next.js App Router:** https://nextjs.org/docs/app
