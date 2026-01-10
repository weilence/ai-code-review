export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode = 500,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class WebhookVerificationError extends AppError {
  constructor(message: string) {
    super(message, 'WEBHOOK_VERIFICATION_ERROR', 401);
    this.name = 'WebhookVerificationError';
  }
}

export class GitLabAPIError extends AppError {
  constructor(message: string, statusCode = 500) {
    super(message, 'GITLAB_API_ERROR', statusCode);
    this.name = 'GitLabAPIError';
  }
}

export class AIProviderError extends AppError {
  constructor(
    message: string,
    public readonly provider: string,
  ) {
    super(message, 'AI_PROVIDER_ERROR', 500);
    this.name = 'AIProviderError';
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR', 500);
    this.name = 'ConfigurationError';
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_ERROR', 429);
    this.name = 'RateLimitError';
  }
}

export class CopilotAuthError extends AppError {
  constructor(
    message: string,
    public readonly errorCode?: string,
  ) {
    super(message, 'COPILOT_AUTH_ERROR', 400);
    this.name = 'CopilotAuthError';
  }
}
