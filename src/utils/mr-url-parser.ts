import { AppError } from './errors';

export interface ParsedMrUrl {
  projectPath: string;
  mrIid: number;
}

export class InvalidMrUrlError extends AppError {
  constructor(message: string) {
    super(message, 'INVALID_MR_URL', 400);
    this.name = 'InvalidMrUrlError';
  }
}

const MR_URL_PATTERN = /^\/(.+?)\/-\/merge_requests\/(\d+)(?:\/.*)?$/;

export function parseMrUrl(url: string, configuredGitLabUrl: string): ParsedMrUrl {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(url);
  } catch {
    throw new InvalidMrUrlError('Invalid URL format');
  }

  const configuredHost = new URL(configuredGitLabUrl).host;

  if (parsedUrl.host !== configuredHost) {
    throw new InvalidMrUrlError(
      `URL host "${parsedUrl.host}" does not match configured GitLab host "${configuredHost}"`,
    );
  }

  const match = MR_URL_PATTERN.exec(parsedUrl.pathname);

  if (!match?.[1] || !match[2]) {
    throw new InvalidMrUrlError(
      'URL does not match GitLab merge request format. Expected: https://<host>/<project-path>/-/merge_requests/<iid>',
    );
  }

  const projectPath = match[1];
  const mrIid = parseInt(match[2], 10);

  if (isNaN(mrIid) || mrIid <= 0) {
    throw new InvalidMrUrlError('Invalid merge request IID');
  }

  return {
    projectPath,
    mrIid,
  };
}
