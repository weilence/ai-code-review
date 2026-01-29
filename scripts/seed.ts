/**
 * 数据库种子数据脚本
 *
 * 用于填充初始数据到数据库
 *
 * 用法：
 *   bun run db:seed          # 填充种子数据
 */
import { getDb, reviews, resetDb } from '@/lib/db';
import { setDBConfig } from '@/lib/features/config';

/**
 * 填充配置种子数据
 */
async function seedConfigData() {
  console.log('📝 Seeding configuration data...\n');

  await setDBConfig({
    gitlab: {
      url: 'https://gitlab.com',
      token: '',
      webhookSecret: '',
    },
    ai: {
      models: {
        'anthropic:claude-sonnet-4-5': {
          provider: 'anthropic',
        },
      },
    },
    webhook: {
      mr: {
        enabled: true,
        events: ['open', 'update'],
        reviewDrafts: false,
      },
      push: {
        enabled: false,
        branches: [],
      },
      note: {
        enabled: true,
        commands: ['/review', '/ai-review'],
      },
    },
    review: {
      maxFiles: 50,
      maxLinesPerFile: 1000,
      skipFiles: ['*.lock', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb', '*.min.js', '*.min.css'],
      inlineComments: true,
      summaryComment: true,
      failureBehavior: 'non-blocking',
      failureThreshold: 'critical',
    },
    log: {
      level: 'info',
    },
    queue: {
      enabled: true,
      pollingIntervalMs: 5000,
      maxConcurrentTasks: 3,
      taskTimeoutMs: 300000,
      maxRetries: 3,
      retryBackoffMs: 60000,
      retryBackoffMultiplier: 2.0,
      maxRetryBackoffMs: 600000,
      cleanupIntervalMs: 3600000,
      retainCompletedDays: 7,
    },
  });

  console.log(`✅ Inserted configuration entries\n`);
}

/**
 * 填充测试审查数据（可选）
 */
async function seedTestData() {
  console.log('📝 Seeding test data...\n');

  const db = await getDb();

  const [review] = await db.insert(reviews).values({
    projectId: '123',
    projectPath: 'test/example-project',
    mrIid: 1,
    mrTitle: 'Test Merge Request',
    mrAuthor: 'test-user',
    mrDescription: 'This is a test MR for seeding data',
    sourceBranch: 'feature/test',
    targetBranch: 'main',
    status: 'completed',
    triggeredBy: 'manual',
    retryCount: 0,
  }).returning();

  console.log(`✅ Created test review: ${review.id}\n`);
}

/**
 * 主函数
 */
async function seed() {
  console.log('🌱 Seeding database...\n');

  try {
    // 填充配置数据
    await seedConfigData();

    // 可选：填充测试数据
    const includeTestData = process.argv.includes('--test-data');
    if (includeTestData) {
      await seedTestData();
    }

    console.log('✅ Seeding completed successfully!\n');
  } catch (err) {
    console.error('❌ Seeding failed!\n');
    console.error(err);
    process.exit(1);
  } finally {
    resetDb();
  }
}

seed();
