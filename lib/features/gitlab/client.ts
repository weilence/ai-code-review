import { Gitlab } from '@gitbeaker/rest';
import type { GitLabConfig } from '@/lib/features/config';
import { createLogger } from '@/lib/utils/logger';
import type {
  MergeRequestChanges,
  GitLabNote,
  GitLabDiscussion,
  InlineCommentPosition,
} from '@/types/gitlab';

const logger = createLogger('gitlab-client');

/**
 * GitLab API 创建讨论的参数类型
 * 与 @gitbeaker/rest 的类型定义对齐（使用 camelCase）
 */
interface GitlabDiscussionOptions {
  position?: {
    positionType: 'text';
    baseSha: string;
    headSha: string;
    startSha: string;
    oldPath: string;
    newPath: string;
    oldLine?: string;
    newLine?: string;
  };
}

export class GitLabClient {
  private api: InstanceType<typeof Gitlab>;

  constructor(config: GitLabConfig) {
    const host = config.url.replace(/\/$/, '');
    const token = config.token;

    logger.debug({
      host,
      hasToken: !!token,
      tokenPrefix: token ? token.substring(0, 10) : 'none',
    }, 'Initializing GitLab client');

    this.api = new Gitlab({
      host,
      token,
    });
  }

  async getMergeRequestChanges(
    projectId: number | string,
    mrIid: number,
  ): Promise<MergeRequestChanges> {
    const mr = await this.api.MergeRequests.show(projectId, mrIid);
    const diffs = await this.api.MergeRequests.allDiffs(projectId, mrIid);

    return {
      ...mr,
      changes: diffs.map(diff => ({
        old_path: diff.old_path,
        new_path: diff.new_path,
        a_mode: diff.a_mode,
        b_mode: diff.b_mode,
        diff: diff.diff ?? '',
        new_file: diff.new_file,
        renamed_file: diff.renamed_file,
        deleted_file: diff.deleted_file,
      })),
      changes_count: diffs.length,
    } as unknown as MergeRequestChanges;
  }

  async postNote(
    projectId: number | string,
    mrIid: number,
    body: string,
  ): Promise<GitLabNote> {
    logger.debug({ projectId, mrIid, bodyLength: body.length }, 'Posting note');

    const note = await this.api.MergeRequestNotes.create(projectId, mrIid, body);

    return note as unknown as GitLabNote;
  }

  async postDiscussion(
    projectId: number | string,
    mrIid: number,
    body: string,
    position: InlineCommentPosition,
  ): Promise<GitLabDiscussion> {
    logger.debug(
      { projectId, mrIid, position },
      'Posting discussion with position',
    );

    const discussionOptions: GitlabDiscussionOptions = {
      position: {
        positionType: 'text',
        baseSha: position.base_sha,
        headSha: position.head_sha,
        startSha: position.start_sha,
        oldPath: position.old_path ?? position.new_path,
        newPath: position.new_path,
        oldLine: position.old_line ? String(position.old_line) : undefined,
        newLine: position.new_line ? String(position.new_line) : undefined,
      },
    };

    const discussion = await this.api.MergeRequestDiscussions.create(
      projectId,
      mrIid,
      body,
      discussionOptions,
    );

    return discussion as unknown as GitLabDiscussion;
  }

  async postInlineComment(
    projectId: number | string,
    mrIid: number,
    body: string,
    filePath: string,
    lineNumber: number,
    diffRefs: { base_sha: string; head_sha: string; start_sha: string },
    isNewLine = true,
    oldPath?: string,
  ): Promise<GitLabDiscussion> {
    const position: InlineCommentPosition = {
      position_type: 'text',
      base_sha: diffRefs.base_sha,
      head_sha: diffRefs.head_sha,
      start_sha: diffRefs.start_sha,
      new_path: filePath,
      old_path: oldPath ?? filePath,
    };

    if (isNewLine) {
      position.new_line = lineNumber;
    } else {
      position.old_line = lineNumber;
    }

    return this.postDiscussion(projectId, mrIid, body, position);
  }

  async getDiscussions(
    projectId: number | string,
    mrIid: number,
  ): Promise<GitLabDiscussion[]> {
    const discussions = await this.api.MergeRequestDiscussions.all(projectId, mrIid);

    return discussions as unknown as GitLabDiscussion[];
  }

  async deleteDiscussionNote(
    projectId: number | string,
    mrIid: number,
    discussionId: string,
    noteId: number,
  ): Promise<void> {
    logger.debug({ projectId, mrIid, discussionId, noteId }, 'Deleting discussion note');

    await this.api.MergeRequestDiscussions.removeNote(projectId, mrIid, discussionId, noteId);
  }

  async getNotes(
    projectId: number | string,
    mrIid: number,
  ): Promise<GitLabNote[]> {
    const notes = await this.api.MergeRequestNotes.all(projectId, mrIid);

    return notes as unknown as GitLabNote[];
  }

  async updateNote(
    projectId: number | string,
    mrIid: number,
    noteId: number,
    body: string,
  ): Promise<GitLabNote> {
    logger.debug({ projectId, mrIid, noteId }, 'Updating note');

    const note = await this.api.MergeRequestNotes.edit(projectId, mrIid, noteId, { body });

    return note as unknown as GitLabNote;
  }

  async setCommitStatus(
    projectId: number | string,
    sha: string,
    state: 'pending' | 'running' | 'success' | 'failed' | 'canceled',
    options?: {
      name?: string;
      description?: string;
      targetUrl?: string;
    },
  ): Promise<void> {
    logger.debug({ projectId, sha, state, name: options?.name }, 'Setting commit status');

    await this.api.Commits.editStatus(projectId, sha, state, {
      name: options?.name ?? 'ai-code-review',
      description: options?.description,
      targetUrl: options?.targetUrl,
    });
  }

  /**
   * 通过项目路径获取项目信息
   * @param projectPath - 项目路径，例如 "wei.luo/scripts-tool" 或 "namespace/project"
   * @returns 项目信息，如果未找到则返回 null
   */
  async getProjectByPath(
    projectPath: string
  ): Promise<{ id: number; path_with_namespace: string; name: string } | null> {
    try {
      logger.debug({ projectPath }, 'Fetching project by path');

      // @gitbeaker/rest 会自动进行 URL 编码，不需要手动编码
      const project = await this.api.Projects.show(projectPath);

      return {
        id: project.id as number,
        path_with_namespace: project.path_with_namespace as string,
        name: project.name as string,
      };
    } catch (error: any) {
      // 详细的错误日志
      logger.error({
        projectPath,
        errorMessage: error.message,
        errorName: error.name,
        causeDescription: error.cause?.description,
        causeResponse: error.cause?.response,
        responseUrl: error.cause?.response?.url,
        responseStatus: error.cause?.response?.status,
      }, 'Failed to fetch project from GitLab');

      return null;
    }
  }
}
