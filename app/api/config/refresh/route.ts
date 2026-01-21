import { NextResponse } from 'next/server';
import { refreshConfig, getConfig } from '@/lib/features/config';

/**
 * 刷新配置缓存
 *
 * POST /api/config/refresh
 */
export async function POST() {
  try {
    // 刷新缓存
    await refreshConfig();

    // 重新加载配置验证
    const config = await getConfig();

    return NextResponse.json({
      success: true,
      message: 'Configuration cache refreshed',
      config: {
        gitlabUrl: config.gitlab.url,
        hasToken: !!config.gitlab.token,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
