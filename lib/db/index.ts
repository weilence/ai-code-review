import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import * as schema from './schema';
import { getDatabasePath, ensureDataDir } from './path';

/**
 * 数据库客户端单例
 *
 * Next.js 环境下使用单例模式避免多个数据库连接
 */

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let sqliteClient: Database | null = null;

export function getDb() {
  if (!db) {
    const databasePath = getDatabasePath();

    // 确保数据目录存在
    ensureDataDir();

    sqliteClient = new Database(databasePath);

    // 优化 SQLite 性能
    sqliteClient.run('PRAGMA journal_mode = WAL;');
    sqliteClient.run('PRAGMA foreign_keys = ON;');
    sqliteClient.run('PRAGMA synchronous = NORMAL;');

    db = drizzle(sqliteClient, { schema });
  }

  return db;
}

/**
 * 重置数据库连接（主要用于测试）
 */
export function resetDb() {
  if (sqliteClient) {
    sqliteClient.close();
    sqliteClient = null;
    db = null;
  }
}

// ============================================================================
// Schema Exports
// ============================================================================

export * from './schema';
