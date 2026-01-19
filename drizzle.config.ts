import type { Config } from 'drizzle-kit';
import { getDatabasePath, ensureDataDir } from './lib/db/path';

// 确保数据目录存在（Drizzle Kit 需要访问数据库）
ensureDataDir();

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: getDatabasePath(),
  },
} satisfies Config;
