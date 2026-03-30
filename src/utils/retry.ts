export type RetryOptions = {
  maxAttempts: number;
  initialDelay: number;
  onRetry?: (attempt: number, delay: number) => void;
};

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function is429(error: unknown): boolean {
  return (
    (error as { response?: { status?: number } })?.response?.status === 429 ||
    (error as { status?: number })?.status === 429
  );
}

function getRetryDelay(error: unknown, attempt: number, initialDelay: number): number {
  const retryAfter = (error as { response?: { headers?: { 'retry-after'?: string } } })?.response
    ?.headers?.['retry-after'];

  if (retryAfter) {
    const value = Number(retryAfter);
    if (!isNaN(value) && value > 0) {
      // If value looks like a Unix timestamp (seconds), compute relative delay
      const nowSeconds = Date.now() / 1000;
      if (value > nowSeconds) {
        return Math.ceil((value - nowSeconds) * 1000);
      }
      return value * 1000;
    }
  }

  return initialDelay * 2 ** (attempt - 1);
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!is429(error) || attempt === options.maxAttempts) throw error;
      const delay = getRetryDelay(error, attempt, options.initialDelay);
      options.onRetry?.(attempt, delay);
      await sleep(delay);
    }
  }
  // TypeScript requires this but the loop above always throws or returns
  throw new Error('withRetry: exhausted attempts');
}
