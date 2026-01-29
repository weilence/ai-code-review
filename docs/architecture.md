# 架构说明

## 技术栈

- **Next.js 16.1.3** - App Router 架构
- **React 19.2.3** - UI 框架
- **Bun + libSQL** - 运行时和数据库
- **Drizzle ORM** - 数据库 ORM
- **Vercel AI SDK** - AI 集成
- **Tailwind CSS v4** - 样式框架
- **Pino** - 日志系统
- **Zod** - Schema 验证

## 目录结构

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
    ├── queue/            # 队列管理 API
    └── review/           # 审查操作 API

lib/
├── features/             # 功能域模块（核心业务逻辑）
│   ├── ai/               # AI 提供商注册表和模型管理
│   ├── config/           # 配置加载和管理
│   ├── gitlab/           # GitLab API 客户端和 diff 解析
│   ├── queue/            # 后台任务队列系统
│   └── review/           # 代码审查引擎
├── db/                   # 数据库访问层（Drizzle + libSQL）
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
│   ├── client-date-time.tsx  # 客户端时间显示组件（自动使用浏览器时区）
│   ├── button.tsx            # 按钮组件
│   └── dialog.tsx            # 对话框组件
└── layout/               # 布局组件

types/                    # 类型定义
├── next.ts               # Next.js 页面类型（PageProps、getStringParam 等）
├── review.ts             # 审查相关类型
├── gitlab.ts             # GitLab 相关类型
└── index.ts              # 通用类型导出
```

## 架构层次

1. **Presentation Layer** - `app/` + `components/`
   - Next.js 页面和 UI 组件
   - 零客户端 JavaScript（服务端组件优先）

2. **Application Layer** - `actions/`
   - Server Actions 处理用户交互
   - 调用 Domain Layer 的功能模块

3. **Domain Layer** - `lib/features/`
   - 核心业务逻辑
   - 按功能域组织（review、gitlab、config、ai、queue）

4. **Infrastructure Layer** - `lib/db/` + `lib/utils/`
   - 数据库访问
   - 通用工具函数

## Custom Server

项目使用 Custom Server (`server.ts`)，所有单例在启动时统一初始化并存储在 `globalThis`。

初始化顺序：
1. GitLabClient（无依赖）
2. ReviewEngine（依赖 GitLabClient）
3. QueueManager（依赖 ReviewEngine）

优雅关闭：SIGTERM/SIGINT 时停止 QueueManager。
