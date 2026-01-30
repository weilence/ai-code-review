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
7. 保存结果到 reviewLogs
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
- `reviewLogs` - 审查日志（JSON 存储内联评论、摘要、错误信息）
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

## 队列系统（lib/features/review/scheduler.ts）

ReviewScheduler 是后台任务队列系统，用于异步处理代码审查任务。采用单线程串行调度模式，确保任务顺序执行。

**核心组件：**
- **ReviewScheduler** - 任务调度器（单线程串行轮询、执行、重试）
- **reviews 表** - 任务队列存储（`status` 字段为 'pending' 的记录）

**队列配置**（在数据库 `settings` 表中）：
| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `pollingIntervalMs` | 轮询间隔（毫秒） | `5000` |

**配置说明：**
- `pollingIntervalMs`: 轮询间隔（毫秒），队列扫描待处理任务的频率。值越小响应越快但数据库负载越高。默认 5000（5秒）。

**队列组件说明：**
- `scheduler.ts` - ReviewScheduler 类（单线程串行调度器）
- `singleton.ts` - 单例访问入口（initScheduler、startScheduler、stopScheduler）

**设计原则：**
- 简化并发控制，使用单线程串行调度
- 任务按创建时间（createdAt）排序
- 数据库事务保证并发安全
- 失败任务不会自动重试，需要用户手动触发重试

**工作流程：**
1. ReviewScheduler 定期轮询数据库，查找 `status='pending'` 的审查任务
2. 找到待处理任务后，将状态更新为 'running'
3. 调用 ReviewEngine 执行代码审查
4. 审查成功或失败后，更新 reviews 表的状态
5. 失败的任务状态为 'failed'，需要用户手动点击重试按钮
