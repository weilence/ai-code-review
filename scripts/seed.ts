/**
 * 数据库种子数据脚本
 *
 * 用于填充初始数据到数据库
 *
 * 用法：
 *   bun run db:seed          # 填充种子数据
 */
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as schema from '@/lib/db/schema';
import { getDatabasePath } from '@/lib/db/path';
import fs from 'fs';

/**
 * 填充配置种子数据
 */
async function seedConfigData(db: ReturnType<typeof drizzle<typeof schema>>) {
  console.log('📝 Seeding configuration data...\n');

  const configEntries = [
    {
      key: 'gitlab.url',
      value: '',
      description: 'GitLab 实例 URL（例如：https://gitlab.com）',
    },
    {
      key: 'gitlab.token',
      value: '',
      description: 'GitLab 个人访问令牌',
    },
    {
      key: 'gitlab.webhookSecret',
      value: '',
      description: 'GitLab Webhook 验证密钥',
    },
    {
      key: 'ai.provider',
      value: 'anthropic',
      description: '默认 AI 提供商（anthropic、openai、github-copilot）',
    },
    {
      key: 'ai.model',
      value: 'claude-sonnet-4-5',
      description: '默认 AI 模型',
    },
    {
      key: 'ai.maxTokens',
      value: 8192,
      description: 'AI 最大生成 token 数',
    },
    {
      key: 'review.enabled',
      value: true,
      description: '是否启用代码审查',
    },
    {
      key: 'review.maxFiles',
      value: 50,
      description: '单次审查最大文件数',
    },
    {
      key: 'review.maxLinesPerFile',
      value: 1000,
      description: '单个文件最大行数',
    },
  ];

  for (const entry of configEntries) {
    await db.insert(schema.settings).values({
      key: entry.key,
      value: entry.value,
      description: entry.description,
    }).onConflictDoNothing();
  }

  console.log(`✅ Inserted ${configEntries.length} configuration entries\n`);
}

/**
 * 填充测试审查数据（可选）
 */
async function seedTestData(db: ReturnType<typeof drizzle<typeof schema>>) {
  console.log('📝 Seeding test data...\n');

  // 创建一个示例审查记录
  const [review] = await db.insert(schema.reviews).values({
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
    triggerEvent: 'test',
    retryCount: 0,
  }).returning();

  console.log(`✅ Created test review: ${review.id}\n`);
}

/**
 * 主函数
 */
async function seed() {
  console.log('🌱 Seeding database...\n');

  const databasePath = getDatabasePath();
  console.log(`📁 Database: ${databasePath}\n`);

  // 检查数据库是否存在
  if (!fs.existsSync(databasePath)) {
    console.error('❌ Database does not exist. Please run `bun run db:push` first.\n');
    process.exit(1);
  }

  const sqlite = new Database(databasePath);

  // 优化 SQLite 性能
  sqlite.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA synchronous = NORMAL;
  `);

  const db = drizzle(sqlite, { schema });

  try {
    // 填充配置数据
    await seedConfigData(db);

    // 可选：填充测试数据
    const includeTestData = process.argv.includes('--test-data');
    if (includeTestData) {
      await seedTestData(db);
    }

    console.log('✅ Seeding completed successfully!\n');
  } catch (err) {
    console.error('❌ Seeding failed!\n');
    console.error(err);
    process.exit(1);
  } finally {
    sqlite.close();
  }
}

seed();
