# 核心模块详解

## 代码审查引擎（lib/features/review/）

ReviewEngine 类是核心组件，负责：

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
1. 创建 reviews 记录（status: running）
2. 获取 MR 变更 → 解析 diff
3. 过滤可审查文件（根据配置的 skipFiles、maxFiles、maxLinesPerFile）
4. 调用 AI 分析（分文件或分批）
5. 生成内联评论 + 摘要
6. 发布到 GitLab（评论 + Commit Status）
7. 保存结果到 reviewResults
8. 更新 reviews 状态（completed/failed）

## AI 提供商注册表（lib/features/ai/）

AICodeReviewRegistry 使用 Vercel AI SDK 的 `createProviderRegistry()` 统一管理多个 AI 提供商：

- **Anthropic**: Claude 模型
- **OpenAI**: GPT 模型
- **GitHub Copilot**: 通过自定义客户端（需要 OAuth token）
- **OpenAI Compatible**: 兼容 OpenAI API 的第三方服务

**模型 ID 格式：** `provider:model-name`（例如 `anthropic:claude-sonnet-4-5`）

**特殊配置：**
- GitHub Copilot 需要额外的 `CopilotTokenStorage` 来管理 OAuth token
- 支持 OpenAI 兼容 API（通过 `baseUrl` 自定义）

## Webhook 处理（lib/webhooks/）

**事件处理器：**
- `merge-request.ts` - MR 打开/更新事件
- `note.ts` - MR 评论命令（`/review`、`/ai-review`）
- `push.ts` - Push 事件（可选）

**验证：** 通过 `X-Gitlab-Token` header 验证 webhook 签名。

**处理流程：**
1. 验证签名（X-Gitlab-Token）
2. 解析事件类型（从 payload 的 object_kind 字段获取，如 merge_request、push、tag_push、note）
3. 保存 webhook 事件到数据库（仅存储 objectKind，不使用映射）
4. 根据事件类型分发到对应处理器
5. 处理器调用 ReviewEngine

## 数据库 Schema（lib/db/schema.ts）

使用 **Drizzle ORM** + **@libsql/client**：

- `reviews` - 审查记录主表（包含状态、耗时、重试次数）
- `reviewResults` - 审查结果（JSON 存储内联评论和摘要）
- `reviewErrors` - 审查错误日志（支持重试标识）
- `webhooks` - Webhook 事件日志（使用 `objectKind` 字段存储 GitLab 原始事件类型）
- `settings` - 配置数据（Key-Value 格式）

**索引：** 在 `projectId + mrIid`、`status`、`createdAt`、`objectKind` 等字段上建立索引。

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

## 队列系统（lib/features/queue/）

QueueManager 是后台任务队列系统，用于异步处理代码审查任务。协调以下组件：

- **TaskQueue** - 任务队列存储
- **TaskScheduler** - 任务调度器（定时轮询）
- **WorkerPool** - 工作池（并发执行控制）
- **TaskExecutor** - 任务执行器（调用 ReviewEngine）
- **RetryHandler** - 重试处理器（指数退避）

**队列配置**（在数据库 `settings` 表中）：
| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `enabled` | 是否启用队列系统 | `true` |
| `pollingIntervalMs` | 轮询间隔（毫秒） | `5000` |
| `maxConcurrentTasks` | 最大并发任务数 | `3` |
| `taskTimeoutMs` | 任务超时时间（毫秒） | `300000` |
| `maxRetries` | 最大重试次数 | `3` |
| `retryBackoffMs` | 重试退避基础时间（毫秒） | `60000` |
| `retryBackoffMultiplier` | 退避时间倍数 | `2.0` |
| `maxRetryBackoffMs` | 最大退避时间（毫秒） | `600000` |
| `cleanupIntervalMs` | 清理间隔（毫秒） | `3600000` |
| `retainCompletedDays` | 保留已完成任务天数 | `7` |

**队列组件说明**：
- `queue.ts` - 队列数据结构和操作
- `scheduler.ts` - 定时调度器，驱动任务执行
- `worker.ts` - 工作池，管理并发执行
- `executor.ts` - 执行器，实际调用审查逻辑
- `retry-handler.ts` - 重试逻辑，支持指数退避
- `schema.ts` - 队列相关类型定义
- `singleton.ts` - 单例访问入口
