import type { Node } from 'figma-js';
import type { LoggerOption } from './logger';

type NodeFilterFunction = (node: Node) => boolean;
type NodeFilterParam = string | NodeFilterFunction;

type ExportableEntities = 'components' | 'instances';

type ExportableEntitiesArray = ExportableEntities[];

export type ExporterConfig = {
  outputDir: string;
  fileId: string;
  canvas?: string;
  frame?: string;
  entityTypeForExport?: ExportableEntities | ExportableEntitiesArray;
  component?: NodeFilterParam;
  batchSize?: number;
  clearOutputDir?: boolean;
  logger?: LoggerOption;
  /** Max retry attempts when the API responds with 429. Default: 3 */
  retryAttempts?: number;
  /** Initial backoff delay in ms for the first retry. Doubles on each attempt. Default: 1000 */
  retryDelay?: number;
  /** Delay in ms between sequential fileImages batch requests. Default: 0 */
  requestDelay?: number;
  /** Max concurrent SVG file downloads. Default: 5 */
  downloadConcurrency?: number;
};

export type DownloadConfig = Pick<
  ExporterConfig,
  'clearOutputDir' | 'outputDir' | 'retryAttempts' | 'retryDelay' | 'downloadConcurrency'
>;
