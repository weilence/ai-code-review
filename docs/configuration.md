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
```

## 业务配置（数据库存储）

GitLab、AI、Review、Webhook 等业务配置存储在数据库 `settings` 表中，支持动态更新。

**配置方式**：通过 `/settings` 页面可视化配置

**配置类别：**
- `gitlab` - GitLab URL、Token、Webhook Secret
- `ai` - AI 提供商配置（API Key、Base URL、模型选择）
- `review` - 审查规则（文件限制、语言、失败行为）
- `webhook` - 事件类型、触发条件
- `log` - 日志级别
- `queue` - 队列系统配置（并发数、超时、重试策略）

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
