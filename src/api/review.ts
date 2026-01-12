import { Hono } from 'hono';
import { z } from 'zod';
import { parseMrUrl, InvalidMrUrlError } from '../utils/mr-url-parser';
import type { ReviewEngine } from '../review/engine';
import { createLogger } from '../utils/logger';

const logger = createLogger('api-review');

const reviewRequestSchema = z.object({
  url: z.string().url(),
});

export function createReviewRoutes(deps: {
  reviewEngine: ReviewEngine;
  gitlabUrl: string;
}) {
  const app = new Hono();

  app.post('/', async (c) => {
    const body: unknown = await c.req.json();
    const parseResult = reviewRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return c.json({ success: false, error: 'Invalid request body', details: parseResult.error.flatten() }, 400);
    }

    const { url } = parseResult.data;

    let projectPath: string;
    let mrIid: number;

    try {
      const parsed = parseMrUrl(url, deps.gitlabUrl);

      projectPath = parsed.projectPath;
      mrIid = parsed.mrIid;
    } catch (error) {
      if (error instanceof InvalidMrUrlError) {
        return c.json({ success: false, error: error.message }, 400);
      }
      throw error;
    }

    logger.info({ projectPath, mrIid, url }, 'Manual review triggered');

    deps.reviewEngine.reviewMergeRequest({
      projectId: projectPath,
      mrIid,
    }).then((result) => {
      logger.info(
        {
          projectPath,
          mrIid,
          inlineCommentsPosted: result.inlineCommentsPosted,
          summaryPosted: result.summaryPosted,
          providerUsed: result.analysis.providerUsed,
          durationMs: result.analysis.durationMs,
        },
        'Manual review completed',
      );
    }).catch((error: unknown) => {
      logger.error({ error, projectPath, mrIid }, 'Manual review failed');
    });

    return c.json({
      success: true,
      message: 'Review triggered',
      projectPath,
      mrIid,
    });
  });

  return app;
}
