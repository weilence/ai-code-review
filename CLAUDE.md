# AI Code Review - Project Guidelines

## Project Overview

GitLab webhook-triggered AI code review system using Bun runtime and Vercel AI SDK.

## Tech Stack

- **Runtime**: Bun
- **Framework**: Hono (HTTP server)
- **AI**: Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`)
- **Validation**: Zod
- **Logging**: Pino
- **Language**: TypeScript

## Project Structure

```
src/
├── index.ts              # HTTP server entry point
├── config/               # Configuration and validation
├── webhooks/             # Webhook handling
│   └── events/           # Event-specific handlers
├── gitlab/               # GitLab API client
├── review/               # AI review engine
├── ai/                   # AI provider abstraction
└── utils/                # Shared utilities
```

## Commands

```bash
# Development
bun run dev              # Start dev server with watch mode
bun run src/index.ts     # Start server

# Testing
bun test                 # Run all tests
bun test --watch         # Run tests in watch mode

# Docker
docker-compose up        # Start with Docker
docker build -t ai-code-review .
```

## Code Style

- Use TypeScript strict mode
- Prefer `interface` over `type` for object shapes
- Use Zod for runtime validation
- Use structured logging with Pino
- Handle errors with custom error classes
- Use async/await, avoid callbacks

## Environment Variables

Required environment variables (see `.env.example`):
- `GITLAB_URL` - GitLab instance URL
- `GITLAB_TOKEN` - GitLab API token
- `GITLAB_WEBHOOK_SECRET` - Webhook verification secret
- `AI_PRIMARY_TYPE` - Primary AI provider (openai/anthropic/openai-compatible)
- `AI_PRIMARY_API_KEY` - Primary AI API key
- `AI_PRIMARY_MODEL` - Primary AI model name

## API Endpoints

- `POST /webhook` - GitLab webhook receiver
- `GET /health` - Health check
- `GET /ready` - Readiness probe

## Key Patterns

### AI Provider Registry
```typescript
// Support multiple providers with fallback
const registry = new AIProviderRegistry();
registry.registerProvider('primary', config);
registry.registerProvider('fallback-1', fallbackConfig);
```

### Structured AI Output
```typescript
// Use Zod schemas for type-safe AI responses
const { object } = await generateObject({
  model,
  schema: CodeReviewResultSchema,
  prompt,
});
```

### GitLab Webhook Verification
```typescript
// Verify X-Gitlab-Token header
const token = headers.get('X-Gitlab-Token');
if (token !== config.gitlab.webhookSecret) {
  throw new WebhookVerificationError('Invalid token');
}
```

## Testing

- Unit tests in `tests/unit/`
- Integration tests in `tests/integration/`
- Test fixtures in `tests/fixtures/`
- Use Bun's built-in test runner

## Security Notes

- Never log API keys or tokens
- Validate all webhook payloads
- Use environment variables for secrets
- Run Docker container as non-root user
