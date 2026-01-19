import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { getDatabasePath, ensureDataDir } from './path';

/**
 * 数据库客户端单例
 *
 * Next.js 环境下使用单例模式避免多个数据库连接
 */

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!db) {
    const databasePath = getDatabasePath();

    // 确保数据目录存在
    ensureDataDir();

    const sqlite = new Database(databasePath);

    // 优化 SQLite 性能
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    sqlite.pragma('synchronous = NORMAL');

    db = drizzle(sqlite, { schema });
  }

  return db;
}

/**
 * 重置数据库连接（主要用于测试）
 */
export function resetDb() {
  if (db) {
    // Type assertion to access internal Drizzle property
    const client = (db as unknown as { readonly __client: Database.Database }).__client;
    client.close();
    db = null;
  }
}

// ============================================================================
// Schema Exports
// ============================================================================

export * from './schema';
