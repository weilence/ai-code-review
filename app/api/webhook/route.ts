import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/features/config';
import { handleWebhook } from '@/lib/webhooks/handler';
import { getReviewEngine } from '@/lib/services';

export async function POST(request: Request) {
  try {
    // 获取配置和服务
    const config = await getConfig();
    const reviewEngine = await getReviewEngine();

    // 处理 webhook
    const result = await handleWebhook({
      webhookSecret: config.gitlab.webhookSecret,
      reviewEngine,
      eventsConfig: config.webhook,
      request,
    });

    // 返回响应
    const statusCode = result.success ? 200 : 500;

    return NextResponse.json(result, { status: statusCode });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 },
    );
  }
}
