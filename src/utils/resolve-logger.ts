import { consoleLogger } from '../lib/console-logger';
import { nullLogger } from '../lib/null-logger';
import type { Logger, LoggerOption } from '../types/logger';

export function resolveLogger(option?: LoggerOption): Logger {
  if (option === false || option === null) return nullLogger;
  if (option === undefined) return consoleLogger;
  return option;
}
