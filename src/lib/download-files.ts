import { ExporterSvgReturn, SvgItem } from '../types/svg';

import fetch from 'node-fetch';
import { DownloadConfig } from '../types/config';
import { createDirectory, cleanDirectory, writeFiles } from '../utils/file-utils';
import { FetchedFile, SavedFile } from '../types/files';
import type { Logger } from '../types/logger';
import { existsSync } from 'fs';
import { withRetry, RetryOptions } from '../utils/retry';

const downloadOne = async (data: SvgItem): Promise<FetchedFile> => {
  const response = await fetch(data.url);

  if (response.status === 429) {
    const retryAfter = response.headers.get('retry-after');
    const err: { status: number; retryAfter: string | null } = {
      status: 429,
      retryAfter,
    };
    throw err;
  }

  if (!response.ok) {
    throw new Error(`Failed to download ${data.name}: HTTP ${response.status}`);
  }

  const body = await response.text();

  return { data: body, name: data.name };
};

const downloadInChunks = async (
  items: SvgItem[],
  concurrency: number,
  retryOptions: RetryOptions,
): Promise<FetchedFile[]> => {
  const filtered = items.filter(item => Boolean(item.url));
  const results: FetchedFile[] = [];

  for (let i = 0; i < filtered.length; i += concurrency) {
    const chunk = filtered.slice(i, i + concurrency);
    const chunkResults = await Promise.all(
      chunk.map(data => withRetry(() => downloadOne(data), retryOptions)),
    );
    results.push(...chunkResults);
  }

  return results;
};

export async function downloadFiles(
  filesData: ExporterSvgReturn,
  config: DownloadConfig,
  logger: Logger,
) {
  logger.info(
    `Stage 2/4: Downloading ${filesData.items.length} SVG files to ${config.outputDir}...`,
  );

  const dirExists = existsSync(config.outputDir);
  await createDirectory(config.outputDir);

  if (!dirExists) {
    logger.info(`Created output directory: ${config.outputDir}`);
  }

  if (config.clearOutputDir) {
    cleanDirectory(config.outputDir);
    logger.info('Cleared output directory');
  }

  const allItems = filesData.items;
  let itemsToDownload = allItems;

  if (config.skipExisting && !config.clearOutputDir) {
    itemsToDownload = allItems.filter(item => !existsSync(`${config.outputDir}/${item.name}.svg`));
    const skipped = allItems.length - itemsToDownload.length;
    if (skipped > 0) {
      logger.info(`Skipping ${skipped} already existing files`);
    }
  }

  const concurrency = config.downloadConcurrency ?? 5;
  const retryOptions: RetryOptions = {
    maxAttempts: config.retryAttempts ?? 3,
    initialDelay: config.retryDelay ?? 1000,
    onRetry: (attempt: number, delay: number) =>
      logger.warn(
        `Download rate limited — retrying in ${delay}ms (attempt ${attempt}/${config.retryAttempts ?? 3})...`,
      ),
  };

  const imageFiles = await downloadInChunks(itemsToDownload, concurrency, retryOptions);

  const filesToSave: SavedFile[] = imageFiles.map(item => {
    return {
      fileName: item.name,
      content: item.data,
      filePath: `${config.outputDir}/${item.name}.svg`,
    };
  });

  try {
    await writeFiles(filesToSave);
    logger.info(`Stage 2/4 complete — ${filesToSave.length} SVG files written to disk`);
  } catch (e) {
    logger.error(`Stage 2/4 failed: ${String(e)}`);
    return;
  }
}
