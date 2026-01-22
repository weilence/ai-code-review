import { z } from 'zod';
import type {
  GitLabUser,
  GitLabNote,
  GitLabDiscussion,
} from '@/types/gitlab';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('gitlab-schemas');

// ============================================================================
// GitLab User Schema
// ============================================================================

export const GitLabUserSchema = z.object({
  id: z.number(),
  name: z.string(),
  username: z.string(),
  email: z.string().optional(),
  avatar_url: z.string().optional(),
}) as z.ZodType<GitLabUser>;

// ============================================================================
// GitLab Note Schema
// ============================================================================

export const GitLabNoteSchema = z.object({
  id: z.number(),
  body: z.string(),
  author: GitLabUserSchema,
  created_at: z.string(),
  updated_at: z.string(),
  system: z.boolean(),
  noteable_id: z.number(),
  noteable_type: z.enum(['MergeRequest', 'Issue', 'Commit', 'Snippet']),
  noteable_iid: z.number().optional(),
  resolvable: z.boolean(),
  resolved: z.boolean().optional(),
  resolved_by: GitLabUserSchema.optional(),
}) as z.ZodType<GitLabNote>;

// ============================================================================
// GitLab Discussion Schema
// ============================================================================

export const GitLabDiscussionSchema = z.object({
  id: z.string(),
  individual_note: z.boolean(),
  notes: z.array(GitLabNoteSchema),
}) as z.ZodType<GitLabDiscussion>;

// ============================================================================
// Validation Helper
// ============================================================================

/**
 * Validate GitLab API response with detailed error logging
 *
 * This function provides runtime validation for GitLab API responses,
 * ensuring that the data matches our expected schema before using it.
 * If validation fails, it logs detailed error information and throws.
 *
 * @param schema - The Zod schema to validate against
 * @param data - The raw data from GitLab API
 * @param context - Context string for error messages (e.g., 'postNote', 'getDiscussions')
 * @returns Validated and typed data
 * @throws Error with detailed information if validation fails
 */
export function validateGitLabResponse<T>(
  schema: z.ZodType<T>,
  data: unknown,
  context: string,
): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      path: issue.path.join('.') || '(root)',
      message: issue.message,
      code: issue.code,
    }));

    logger.error(
      {
        context,
        errors,
        receivedData: JSON.stringify(data, null, 2).substring(0, 500),
      },
      'GitLab API response validation failed',
    );

    throw new Error(
      `GitLab API response validation failed for ${context}:\n` +
        `Errors:\n${JSON.stringify(errors, null, 2)}\n\n` +
        `Received data (first 500 chars):\n${JSON.stringify(data, null, 2).substring(0, 500)}...`,
    );
  }

  return result.data;
}
