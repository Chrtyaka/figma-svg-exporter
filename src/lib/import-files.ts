import type { ClientInterface } from 'figma-js';
import { ExporterConfig } from '../types/config';
import { ExporterSvgReturn, SvgItem } from '../types/svg';
import { processFile } from 'figma-transformer';
import type { ProcessedFile } from 'figma-transformer';
import { findCanvas, findFrameInCanvas } from '../utils/process-figma-file';
import { ExportableEntity } from '../types/figma-file';
import type { Logger } from '../types/logger';
import { withRetry, sleep } from '../utils/retry';

const mapBatchImagesToNodes = (
  imageUrls: Record<string, string>,
  entities: ExportableEntity[],
): SvgItem[] => {
  return Object.entries(imageUrls).map(([key, url]) => {
    const entity = entities.find(item => item.id === key);

    const id = entity?.id ?? '';
    const name = entity?.name ?? '';

    return { id, name, url };
  });
};

export async function importFiles(
  client: ClientInterface,
  config: ExporterConfig,
  logger: Logger,
): Promise<ExporterSvgReturn> {
  const { fileId, entityTypeForExport } = config;
  const entityForExport = entityTypeForExport || 'components';
  const batchSize = config.batchSize || 100;
  const requestDelay = config.requestDelay ?? 0;

  const retryOptions = {
    maxAttempts: config.retryAttempts ?? 3,
    initialDelay: config.retryDelay ?? 1000,
    onRetry: (attempt: number, delay: number) =>
      logger.warn(
        `Rate limited by Figma API — retrying in ${delay}ms (attempt ${attempt}/${config.retryAttempts ?? 3})...`,
      ),
  };

  logger.info(`Stage 1/4: Fetching Figma file ${fileId}...`);

  const fileData = await withRetry(() => client.file(fileId), retryOptions);
  const { lastModified } = fileData.data;

  logger.info(`Figma file fetched (last modified: ${lastModified})`);

  const processedFile: ProcessedFile = processFile(fileData.data, fileId);

  let canvas = config.canvas ? findCanvas(processedFile, config.canvas) : processedFile;

  if (canvas === undefined) {
    logger.warn(`Canvas "${config.canvas}" not found — using root file`);
    canvas = processedFile;
  }

  const frame = config.frame ? findFrameInCanvas(canvas, config.frame) : canvas;

  if (!frame) {
    logger.warn(`Frame "${config.frame}" not found — no items to export`);
    return { items: [], lastModified };
  }

  const { shortcuts } = frame;

  if (!shortcuts) {
    return { items: [], lastModified };
  }

  const entities = Array.isArray(entityForExport)
    ? entityForExport.map(item => shortcuts[item]).flat()
    : shortcuts[entityForExport];

  logger.info(`Found ${entities.length} ${entityForExport} to export`);

  const entityIds = entities.map(item => item.id);
  const batchCount = Math.ceil(entityIds.length / batchSize);

  logger.info(`Requesting SVG export URLs in ${batchCount} batch(es) of up to ${batchSize}...`);

  const responses = [];
  for (let i = 0; i < batchCount; i++) {
    if (batchCount > 1) {
      logger.info(`Fetching batch ${i + 1}/${batchCount}...`);
    }

    const response = await withRetry(
      () =>
        client.fileImages(config.fileId, {
          format: 'svg',
          ids: entityIds.slice(i * batchSize, (i + 1) * batchSize),
        }),
      retryOptions,
    );

    responses.push(response);

    if (requestDelay > 0 && i < batchCount - 1) {
      await sleep(requestDelay);
    }
  }

  const images = responses
    .map(item => item.data.images)
    .flat()
    .map(item => mapBatchImagesToNodes(item, entities))
    .flat();

  logger.info(`Stage 1/4 complete — ${images.length} export URLs resolved`);

  return { items: images, lastModified };
}
