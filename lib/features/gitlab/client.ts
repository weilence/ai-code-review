import { DiscussionNotePositionOptions, DiscussionSchema, Gitlab } from '@gitbeaker/rest';
import type { GitLabConfig } from '@/lib/features/config';
import { createLogger } from '@/lib/utils/logger';
import type {
  DeepCamelize,
  MergeRequestChanges,
} from '@/types/gitlab';

const logger = createLogger('gitlab-client');

export class GitLabClient {
  private api: InstanceType<typeof Gitlab<true>>;

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
      camelize: true,
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
      changes: diffs,
    } as MergeRequestChanges;
  }

  async postNote(
    projectId: number | string,
    mrIid: number,
    body: string,
  ) {
    logger.debug({ projectId, mrIid, bodyLength: body.length }, 'Posting note');

    const note = await this.api.MergeRequestNotes.create(projectId, mrIid, body);

    return note;
  }

  async postDiscussion(
    projectId: number | string,
    mrIid: number,
    body: string,
    position: DiscussionNotePositionOptions,
  ) {
    logger.debug(
      { projectId, mrIid, position },
      'Posting discussion with position',
    );

    const discussion = await this.api.MergeRequestDiscussions.create(
      projectId,
      mrIid,
      body,
      {
        position,
      },
    );

    return discussion;
  }

  async postInlineComment(
    projectId: number | string,
    mrIid: number,
    body: string,
    filePath: string,
    lineNumber: number,
    diffRefs: { baseSha: string; headSha: string; startSha: string },
    isNewLine = true,
    oldPath?: string,
  ) {
    const position: DiscussionNotePositionOptions = {
      positionType: 'text',
      baseSha: diffRefs.baseSha,
      headSha: diffRefs.headSha,
      startSha: diffRefs.startSha,
      newPath: filePath,
      oldPath: oldPath ?? filePath,
    }

    if (isNewLine) {
      position.newLine = lineNumber.toString();
    } else {
      position.oldLine = lineNumber.toString();
    }

    return this.postDiscussion(projectId, mrIid, body, position);
  }

  async getDiscussions(
    projectId: number | string,
    mrIid: number,
  ) {
    const discussions = await this.api.MergeRequestDiscussions.all(projectId, mrIid);

    return discussions as DeepCamelize<DiscussionSchema>[]
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
  ) {
    const notes = await this.api.MergeRequestNotes.all(projectId, mrIid);

    return notes;
  }

  async updateNote(
    projectId: number | string,
    mrIid: number,
    noteId: number,
    body: string,
  ) {
    logger.debug({ projectId, mrIid, noteId }, 'Updating note');

    const note = await this.api.MergeRequestNotes.edit(projectId, mrIid, noteId, { body });

    return note;
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

  async getProjectByPath(
    projectPath: string
  ): Promise<{ id: number; path_with_namespace: string; name: string } | null> {
    logger.debug({ projectPath }, 'Fetching project by path');

    const project = await this.api.Projects.show(projectPath);

    return {
      id: project.id,
      path_with_namespace: project.path_with_namespace as string,
      name: project.name,
    };
  }
}
