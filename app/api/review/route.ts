import { NextResponse } from 'next/server';
import { getDBConfig } from '@/lib/features/config';
import { getReviewEngine } from '@/lib/features/review/singleton';
import { parseGitLabMRUrl } from '@/lib/utils/gitlab';
import { GitLabClient } from '@/lib/features/gitlab/client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;

    // 验证请求
    if (!url) {
      return NextResponse.json(
        { success: false, message: 'Missing required field: url' },
        { status: 400 }
      );
    }

    // 解析 GitLab URL
    const parsed = parseGitLabMRUrl(url);
    if (!parsed) {
      return NextResponse.json(
        { success: false, message: 'Invalid GitLab MR URL format' },
        { status: 400 }
      );
    }

    const { projectPath, mrIid } = parsed;

    // 获取配置和服务
    const config = await getDBConfig();
    const reviewEngine = await getReviewEngine();

    // 创建 GitLab client
    const gitlabClient = new GitLabClient({
      url: config.gitlab.url,
      token: config.gitlab.token,
      webhookSecret: config.gitlab.webhookSecret,
    });

    // 从项目路径获取项目 ID
    const projectInfo = await gitlabClient.getProjectByPath(projectPath);

    if (!projectInfo) {
      return NextResponse.json(
        { success: false, message: `Project not found: ${projectPath}` },
        { status: 404 }
      );
    }

    const projectId = projectInfo.id;

    // 异步触发审查（不等待完成）
    reviewEngine.reviewMergeRequest({
      projectId,
      mrIid,
      triggeredBy: 'manual',
      triggerEvent: 'api',
    }).catch((error) => {
      // 审查失败，中间件已经记录了请求
      console.error('Review failed:', error);
    });

    // 立即返回响应（审查在后台执行）
    return NextResponse.json({
      success: true,
      message: 'Code review triggered successfully',
      data: {
        projectId,
        mrIid,
        projectPath,
        status: 'pending',
        message: 'Review is running in the background',
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
