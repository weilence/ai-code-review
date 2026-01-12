import { RateLimitError } from './errors';

interface RateLimitWindow {
  requests: number[];
}

export class RateLimiter {
  private windows = new Map<string, RateLimitWindow>();

  constructor(
    private maxRequests: number,
    private windowMs: number,
  ) {}

  checkLimit(key: string): boolean {
    const now = Date.now();
    let window = this.windows.get(key);

    if (!window) {
      window = { requests: [] };
      this.windows.set(key, window);
    }

    // Remove old requests outside window
    window.requests = window.requests.filter(time => now - time < this.windowMs);

    if (window.requests.length >= this.maxRequests) {
      return false;
    }

    window.requests.push(now);

    return true;
  }

  async waitForSlot(key: string, maxWaitMs = 5000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      if (this.checkLimit(key)) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new RateLimitError(`Rate limit exceeded for key: ${key}`);
  }

  reset(key: string): void {
    this.windows.delete(key);
  }

  resetAll(): void {
    this.windows.clear();
  }
}

// GitLab API rate limiter (600 requests per minute)
export const gitlabRateLimiter = new RateLimiter(600, 60000);

// AI API rate limiter (configurable, default 60 requests per minute)
export const aiRateLimiter = new RateLimiter(60, 60000);
