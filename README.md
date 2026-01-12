# ai-code-review

GitLab webhook-triggered AI code review system using Bun runtime and Vercel AI SDK.

## Installation

To install dependencies:

```bash
bun install
```

## Development

To run in development mode with watch:

```bash
bun run dev
```

To run in production mode:

```bash
bun run start
```

## Code Quality

### Linting

This project uses ESLint with TypeScript support and @stylistic/eslint-plugin for code formatting.

```bash
# Check for linting errors
bun run lint

# Auto-fix linting errors
bun run lint:fix

# Format code (alias for lint:fix)
bun run format
```

### Type Checking

```bash
bun run typecheck
```

### Testing

```bash
# Run tests
bun run test

# Run tests in watch mode
bun run test:watch
```

## Configuration

See `.env.example` for required environment variables.

## Tech Stack

- **Runtime**: Bun
- **Framework**: Hono (HTTP server)
- **AI**: Vercel AI SDK
- **Validation**: Zod
- **Logging**: Pino
- **Code Quality**: ESLint + @stylistic/eslint-plugin

---

This project was created using `bun init` in bun v1.3.5. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
