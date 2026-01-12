import { loadConfigSync } from 'zod-config';
import { envAdapter } from 'zod-config/env-adapter';
import { AppConfigSchema } from './schema';
import type { AppConfig } from './schema';

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
}

export function loadConfig(): AppConfig {
  const config = loadConfigSync({
    schema: AppConfigSchema,
    adapters: envAdapter({
      nestingSeparator: '__',
      transform: ({ key, value }) => {
        const transformedKey = key
          .toLowerCase()
          .split('__')
          .map(part => snakeToCamel(part))
          .join('__');

        return { key: transformedKey, value };
      },
    }),
  });

  return config;
}

export const config = loadConfig();

export type { AppConfig, AIProviderConfig, AIProviderType } from './schema';
