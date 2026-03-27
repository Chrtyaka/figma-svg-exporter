import type { Logger } from '../types/logger';

export const nullLogger: Logger = {
  info() {},
  warn() {},
  error() {},
};
