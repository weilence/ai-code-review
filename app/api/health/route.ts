import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createRequestLogger } from '@/lib/utils/logger';

export async function GET(request: Request) {
  const logger = await createRequestLogger('health-api', request);

  try {
    // 检查数据库连接
    void getDb();

    // 简单查询检查数据库是否正常工作
    // 这里可以添加更多的健康检查逻辑

    logger.info('Health check passed');

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error({ error: errorMessage }, 'Health check failed');

    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: errorMessage,
      },
      { status: 503 },
    );
  }
}
