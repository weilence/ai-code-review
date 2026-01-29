import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

export type Db = ReturnType<typeof drizzle<typeof schema>>;

export async function getDb(): Promise<Db> {
  if (!globalThis.__DB__) {
    throw new Error(
      'Database has not been initialized. Make sure the server is running.',
    );
  }

  return globalThis.__DB__;
}

export function resetDb(): void {
  globalThis.__DB__ = undefined;
}

export * from './schema';
