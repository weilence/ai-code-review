
import { getDBConfig } from '@/lib/features/config'
import { GitLabClient } from '@/lib/features/gitlab/client'
import { AICodeReviewRegistry } from '@/lib/features/ai'
import { CopilotTokenStorage } from '@/lib/features/ai/github-copilot'
import { ReviewEngine } from '@/lib/features/review/engine'
import { QueueManager } from '@/lib/features/queue'
import { DEFAULT_AI_MODEL } from '@/lib/constants'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger('instrumentation')

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await initializeSingletons()
  }
}

async function initializeSingletons(): Promise<void> {
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

  if (!globalThis.__QUEUE_MANAGER__) {
    globalThis.__QUEUE_MANAGER__ = new QueueManager(
      globalThis.__REVIEW_ENGINE__,
      config.queue,
    )
    logger.info('QueueManager initialized')
  }

  await globalThis.__QUEUE_MANAGER__.start()
  logger.info('QueueManager started')

  // 优雅关闭
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

async function shutdown(): Promise<void> {
  logger.info('Shutting down...')

  if (globalThis.__QUEUE_MANAGER__) {
    await globalThis.__QUEUE_MANAGER__.stop()
    logger.info('QueueManager stopped')
  }

  process.exit(0)
}
