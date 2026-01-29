# 开发指南

## 添加新功能

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

## Next.js 页面类型

Next.js 15+ 中，`params` 和 `searchParams` 都是 **Promise**，必须 `await` 才能获取值。

**统一使用项目中的类型定义**（types/next.ts）：

```typescript
import type { PageProps, getStringParam } from '@/types/next';

export default async function ReviewsPage({ searchParams }: PageProps) {
  const status = await getStringParam(searchParams || {}, 'status');
  return <div>筛选: {status}</div>;
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
  return <div>ID: {id}</div>;
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

## 时区处理

**重要：** 服务端渲染时使用服务器时区，在 Docker 容器中通常是 UTC，与用户浏览器时区不一致。

**解决方案：** 使用客户端组件显示时间，自动应用浏览器时区设置。

```typescript
import { ClientDateTime } from '@/components/ui/client-date-time';

// 相对时间（如 "3分钟前"）
<ClientDateTime date={review.createdAt} mode="relative" />

// 绝对时间（如 "2025/01/22 14:30:45"）
<ClientDateTime date={review.createdAt} mode="absolute" />

// 相对时间 + 绝对时间（tooltip 显示绝对时间）
<ClientDateTime date={review.createdAt} mode="both" />
```

**使用场景：**
- ✅ 在 UI 页面中显示时间（审查记录、Webhook 日志等）
- ❌ 避免在服务端使用 `date.toLocaleString()` 或 `formatDate()` 函数
- ❌ `lib/utils/format.ts` 中的 `formatDate()` 已标记为 `@deprecated`

**组件特性：**
- 使用 `'use client'` 指令确保在浏览器中运行
- 首次渲染前显示占位符 (`--`)，避免水合不匹配
- 支持自定义语言环境（默认 `zh-CN`）
- 鼠标悬停时显示完整时间（tooltip）

## 错误处理

**审查错误处理：**
- 所有审查错误保存到 `reviewErrors` 表
- 包含错误类型、消息、堆栈跟踪
- 支持重试标识（`retryable` 字段）

## AI 模型选择

- **配置格式：** `provider:model-id`
- **多模型支持：** 在配置中添加多个模型，使用 `provider:model-id` 作为 key
- **默认模型：** ReviewEngine 使用配置中的第一个模型

## 审查规则

- **文件过滤：** `skipFiles` 支持通配符（`*.lock`, `*.min.js`）
- **文件限制：** `maxFiles`（默认 50）、`maxLinesPerFile`（默认 1000）
- **失败阈值：** `failureThreshold` 设置最低严重级别（critical > major > minor > suggestion）
- **失败行为：** `blocking`（阻止合并）或 `non-blocking`

## 代码风格

### 注释
- 保持最少，除非必要不添加 JSDoc 或行内注释
- 代码本身应该足够清晰，无需过度注释

### 导入顺序
```typescript
// 导入顺序：
// 1. React/Next.js
// 2. 第三方库
// 3. 内部类型
// 4. 内部功能模块
// 5. 工具函数
import { useState } from 'react';
import { ai } from '@ai-sdk/openai';
import type { PageProps } from '@/types/next';
import { getReviewEngine } from '@/lib/features/review';
import { formatDate } from '@/lib/utils/format';
```

**推荐导入路径：**
- `@/types/*` - 类型定义
- `@/lib/features/*` - 功能域模块
- `@/lib/db` - 数据库
- `@/actions/*` - Server Actions
- `@/components/*` - UI 组件

### 日志
使用 Pino 创建具名日志器：
```typescript
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('module-name');
logger.info({ reviewId }, 'Review started');
logger.error({ error }, 'Review failed');
```

### 参考资料
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Drizzle ORM](https://orm.drizzle.team)
- [Next.js App Router](https://nextjs.org/docs/app)
