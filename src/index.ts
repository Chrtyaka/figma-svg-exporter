import * as Figma from 'figma-js';
import path from 'path';
import { ExporterConfig } from './types/config';
import { downloadFiles } from './lib/download-files';
import { importFiles } from './lib/import-files';
import { processFiles } from './lib/process-files';
import { generateFileNamesUnionType } from './lib/types-generator';
import { resolveLogger } from './utils/resolve-logger';

export type { Logger, LoggerOption } from './types/logger';
export { consoleLogger } from './lib/console-logger';

export async function exportFiles(token: string, config: ExporterConfig) {
  const logger = resolveLogger(config.logger);

  const client = Figma.Client({
    personalAccessToken: token,
  });

  const outputDir = path.resolve(config.outputDir);

  const filesData = await importFiles(client, config, logger);

  await downloadFiles(
    filesData,
    {
      outputDir,
      clearOutputDir: config.clearOutputDir,
      retryAttempts: config.retryAttempts,
      retryDelay: config.retryDelay,
      downloadConcurrency: config.downloadConcurrency,
    },
    logger,
  );

  await processFiles(outputDir, logger);

  // await createComponents(outputDir, 'vue');

  await generateFileNamesUnionType('SvgIcons', outputDir, logger);

  logger.info('Export finished successfully');

  process.exit(0);
}
