import type { Config } from 'drizzle-kit';
import { getDatabasePath } from './lib/db/path';

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: getDatabasePath(),
  },
} satisfies Config;
