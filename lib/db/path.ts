/**
 * 获取数据库文件路径
 * 优先使用环境变量 DATABASE_PATH，否则使用用户数据目录
 */
export function getDatabasePath(): string {
  let path = '.data'
  // 如果设置了环境变量，直接使用
  if (process.env.DATABASE_PATH) {
    path = process.env.DATABASE_PATH
  }

  return path + '/ai-code-review.db'
}
