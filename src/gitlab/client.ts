import { Gitlab } from '@gitbeaker/rest';
import type { GitLabConfig } from '../config/schema';
import type {
  GitLabMergeRequestChanges,
  GitLabNote,
  GitLabDiscussion,
  GitLabPosition,
} from './types';
import { createLogger } from '../utils/logger';

const logger = createLogger('gitlab-client');

export class GitLabClient {
  private api: InstanceType<typeof Gitlab>;

  constructor(config: GitLabConfig) {
    this.api = new Gitlab({
      host: config.url.replace(/\/$/, ''),
      token: config.token,
    });
  }

  async getMergeRequestChanges(
    projectId: number | string,
    mrIid: number,
  ): Promise<GitLabMergeRequestChanges> {
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
    } as unknown as GitLabMergeRequestChanges;
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
    position: GitLabPosition,
  ): Promise<GitLabDiscussion> {
    logger.debug(
      { projectId, mrIid, position },
      'Posting discussion with position',
    );

    const discussion = await this.api.MergeRequestDiscussions.create(
      projectId,
      mrIid,
      body,
      {
        position: {
          positionType: 'text',
          baseSha: position.base_sha,
          headSha: position.head_sha,
          startSha: position.start_sha,
          oldPath: position.old_path ?? position.new_path,
          newPath: position.new_path,
          oldLine: position.old_line as unknown as string,
          newLine: position.new_line as unknown as string,
        },
      },
    );

    return discussion as unknown as GitLabDiscussion;
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
  ): Promise<GitLabDiscussion> {
    const position: GitLabPosition = {
      position_type: 'text',
      base_sha: diffRefs.baseSha,
      head_sha: diffRefs.headSha,
      start_sha: diffRefs.startSha,
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
}
