/**
 * Next.js 15+ App Router 页面和布局的通用类型定义
 *
 * Next.js 15 重要变化：
 * - params 和 searchParams 从同步对象变为 Promise
 * - 必须使用 await 获取参数值
 */

/**
 * 页面组件的 Props 类型
 * 用于 App Router 的 page.tsx 文件
 */
export type PageProps = {
  params?: Promise<Record<string, string | string[]>>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

/**
 * 布局组件的 Props 类型
 * 用于 App Router 的 layout.tsx 文件
 */
export type LayoutProps = {
  children: React.ReactNode
  params?: Promise<Record<string, string | string[]>>
}

/**
 * 带有指定 params 的页面 Props
 * 用于动态路由，例如 app/[id]/page.tsx
 */
export type DynamicPageProps<T extends Record<string, string | string[]>> = {
  params: Promise<T>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

/**
 * 带有指定 params 的布局 Props
 * 例如 app/[id]/layout.tsx
 */
export type DynamicLayoutProps<T extends Record<string, string | string[]>> = {
  children: React.ReactNode
  params: Promise<T>
}

/**
 * 辅助函数：从 searchParams Promise 中提取单个字符串值
 * 处理可能是数组的情况
 */
export async function getStringParam(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
  key: string
): Promise<string | undefined> {
  const params = await searchParams
  const value = params[key]

  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

/**
 * 辅助函数：从 searchParams Promise 中提取多个字符串值
 */
export async function getArrayParam(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
  key: string
): Promise<string[] | undefined> {
  const params = await searchParams
  const value = params[key]

  if (value === undefined) {
    return undefined
  }

  return Array.isArray(value) ? value : [value]
}

/**
 * 辅助函数：从 params Promise 中提取参数
 */
export async function getParam(
  params: Promise<Record<string, string | string[]>>,
  key: string
): Promise<string | undefined> {
  const p = await params
  const value = p[key]

  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}
