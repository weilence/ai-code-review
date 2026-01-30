
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import { getDBConfig } from '@/lib/features/config'
import { GitLabClient } from '@/lib/features/gitlab/client'
import { AICodeReviewRegistry } from '@/lib/features/ai'
import { CopilotTokenStorage } from '@/lib/features/ai/github-copilot'
import { ReviewEngine } from '@/lib/features/review/engine'
import { initScheduler, startScheduler, stopScheduler } from '@/lib/features/review/singleton'
import { DEFAULT_AI_MODEL } from '@/lib/constants'
import { createLogger } from '@/lib/utils/logger'
import { getDatabasePath } from '@/lib/db/path'
import * as schema from '@/lib/db/schema'

const logger = createLogger('instrumentation')

export async function initializeSingletons(): Promise<void> {
  if (!globalThis.__DB__) {
    const databasePath = getDatabasePath()

    const url = databasePath.startsWith('file:')
      ? databasePath
      : `file:${databasePath}`

    const libsqlClient = createClient({ url })

    await libsqlClient.execute('PRAGMA journal_mode = WAL;')
    await libsqlClient.execute('PRAGMA foreign_keys = ON;')
    await libsqlClient.execute('PRAGMA synchronous = NORMAL;')

    globalThis.__DB__ = drizzle(libsqlClient, { schema })
    logger.info('Database initialized')
  }

  const config = await getDBConfig()

  if (!globalThis.__GITLAB_CLIENT__) {
    globalThis.__GITLAB_CLIENT__ = new GitLabClient(config.gitlab)
    logger.info('GitLabClient initialized')
  }

  const copilotTokenStorage = new CopilotTokenStorage()
  const aiRegistry = new AICodeReviewRegistry(config.ai, copilotTokenStorage)

  const firstModelId = Object.keys(config.ai.models)[0]
  const modelId = (firstModelId as `anthropic:${string}` | `openai:${string}` | `github-copilot:${string}` | `openai-compatible:${string}`) || DEFAULT_AI_MODEL as `anthropic:${string}` | `openai:${string}` | `github-copilot:${string}` | `openai-compatible:${string}`

  if (!globalThis.__REVIEW_ENGINE__) {
    globalThis.__REVIEW_ENGINE__ = new ReviewEngine(
      aiRegistry,
      modelId,
      globalThis.__GITLAB_CLIENT__,
      config.review,
    )
    logger.info('ReviewEngine initialized')
  }

  if (!globalThis.__REVIEW_SCHEDULER__) {
    initScheduler(
      globalThis.__REVIEW_ENGINE__,
      config.queue?.pollingIntervalMs || 5000,
    )
    logger.info('ReviewScheduler initialized')
  }

  await startScheduler()
  logger.info('ReviewScheduler started')

  // 优雅关闭
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

async function shutdown(): Promise<void> {
  logger.info('Shutting down...')

  await stopScheduler()
  logger.info('ReviewScheduler stopped')

  process.exit(0)
}
