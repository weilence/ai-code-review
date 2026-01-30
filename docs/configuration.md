# 配置说明

## 配置职责分离

系统采用配置职责分离设计：

- **环境变量**：系统级参数（`port`、`host`），用于服务器启动
- **数据库**：业务配置（GitLab、AI、Review、Webhook、Log 等），支持动态更新

## 环境变量（系统级参数）

仅用于系统启动时的基础配置，通过环境变量或 `.env` 文件设置：

```bash
# 服务器配置（默认值可省略）
PORT=3000                      # 服务器端口，默认 3000
HOST=0.0.0.0                   # 监听地址，默认 0.0.0.0

# 数据库路径（可选）
DATABASE_PATH=/custom/path/to/database.db

# 日志级别（可选）
LOG_LEVEL=info                 # trace | debug | info | warn | error
```

**数据库路径说明：**
- 默认位置：`~/.local/share/ai-code-review/ai-code-review.db`（Linux）或 `~/Library/Application Support/ai-code-review/ai-code-review.db`（macOS）
- 可通过 `DATABASE_PATH` 环境变量自定义

**日志级别说明：**
- `trace`: 最详细的日志输出（开发调试用）
- `debug`: 调试信息
- `info`: 一般信息（默认）
- `warn`: 警告信息
- `error`: 仅错误信息

## 业务配置（数据库存储）

GitLab、AI、Review、Webhook 等业务配置存储在数据库 `settings` 表中，支持动态更新。

**配置方式**：通过 `/settings` 页面可视化配置

**配置类别：**
- `gitlab` - GitLab URL、Token、Webhook Secret
- `ai` - AI 提供商配置（API Key、Base URL、模型选择）
- `review` - 审查规则（文件限制、语言、失败行为）
- `webhook` - 事件类型、触发条件
- `log` - 日志级别
- `queue` - 队列系统配置（轮询间隔）
- `copilot` - GitHub Copilot 配置（OAuth token、API 端点）

## AI 模型配置格式

```json
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

## 配置加载

```typescript
// 获取数据库配置
const dbConfig = await getDBConfig();
```

## 队列配置格式

```json
{
  "queue": {
    "pollingIntervalMs": 5000
  }
}
```

**配置说明：**
- `pollingIntervalMs`: 轮询间隔（毫秒），默认 5000（5秒）。队列扫描待处理任务的频率，值越小响应越快但数据库负载越高

**注意：**
- 当前使用单线程串行调度模式
- 失败任务不会自动重试，需要用户手动点击重试按钮
- 没有并发任务数限制（单线程逐个执行）

## GitHub Copilot 配置格式

```json
{
  "copilot": {
    "refreshToken": "ghu_xxx",
    "accessToken": "ghu_xxx",
    "accessTokenExpiresAt": 1738272000,
    "baseUrl": "https://api.githubcopilot.com",
    "enterpriseUrl": "https://api.githubcopilot-enterprise.com"
  }
}
```

**配置说明：**
- `refreshToken`: OAuth 刷新令牌（必填）
- `accessToken`: OAuth 访问令牌（自动刷新，无需手动配置）
- `accessTokenExpiresAt`: 访问令牌过期时间戳（自动刷新，无需手动配置）
- `baseUrl`: Copilot API 基础 URL（默认 `https://api.githubcopilot.com`）
- `enterpriseUrl`: 企业版 Copilot API URL（可选）

**注意：**
- GitHub Copilot 使用 OAuth 2.0 认证
- 只需配置 `refreshToken`，`accessToken` 会自动刷新
- Copilot token 存储在数据库的 `settings` 表中
