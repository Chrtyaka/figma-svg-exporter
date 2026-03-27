import type { Logger } from '../types/logger';

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';

const PREFIX = `${DIM}[figma-exporter]${RESET}`;

export const consoleLogger: Logger = {
  info(message: string) {
    console.log(`${PREFIX} ${CYAN}${BOLD}>${RESET} ${message}`);
  },
  warn(message: string) {
    console.warn(`${PREFIX} ${YELLOW}!${RESET}  ${message}`);
  },
  error(message: string) {
    console.error(`${PREFIX} ${RED}x${RESET}  ${message}`);
  },
};
