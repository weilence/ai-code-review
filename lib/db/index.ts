import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { getDatabasePath } from './path';

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let libsqlClient: ReturnType<typeof createClient> | null = null;

export async function getDb() {
  if (!db) {
    const databasePath = getDatabasePath();

    const url = databasePath.startsWith('file:')
      ? databasePath
      : `file:${databasePath}`;

    libsqlClient = createClient({ url });

    await libsqlClient.execute('PRAGMA journal_mode = WAL;');
    await libsqlClient.execute('PRAGMA foreign_keys = ON;');
    await libsqlClient.execute('PRAGMA synchronous = NORMAL;');

    db = drizzle(libsqlClient, { schema });
  }

  return db;
}

export function resetDb() {
  if (libsqlClient) {
    libsqlClient.close();
    libsqlClient = null;
    db = null;
  }
}

export * from './schema';
