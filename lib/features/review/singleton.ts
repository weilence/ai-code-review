import type { ReviewEngine } from './engine';

export async function getReviewEngine(): Promise<ReviewEngine> {
  if (!globalThis.__REVIEW_ENGINE__) {
    throw new Error(
      'ReviewEngine has not been initialized. Make sure the server is running.',
    );
  }

  return globalThis.__REVIEW_ENGINE__;
}

export function resetReviewEngine(): void {
  globalThis.__REVIEW_ENGINE__ = undefined;
}
