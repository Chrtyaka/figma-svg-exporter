import { optimize } from 'svgo';
import { getFileContentsInDirectory, writeFiles } from '../utils/file-utils';
import type { SavedFile } from '../types/files';
import type { Logger } from '../types/logger';

const FILL_REGEX = /fill="#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})"/gm;

export type FilesData = {
  path: string;
  content: string;
};

const replaceFill = (files: SavedFile[]): SavedFile[] => {
  return files.map(item => {
    const content = item.content.replace(FILL_REGEX, 'fill="currentColor"');

    return {
      ...item,
      content,
    };
  });
};

const optimizeFiles = (files: SavedFile[]): SavedFile[] => {
  return files.map(item => {
    const { data } = optimize(item.content, {
      multipass: true,
      plugins: [
        'cleanupAttrs',
        'cleanupEnableBackground',
        'cleanupIds',
        'cleanupListOfValues',
        'cleanupNumericValues',
        'collapseGroups',
        'convertEllipseToCircle',
        'convertPathData',
        'convertShapeToPath',
        'convertTransform',
        'sortDefsChildren',
        'sortAttrs',
        'reusePaths',
        'removeXMLNS',
        'removeUselessStrokeAndFill',
        'removeUselessDefs',
        'removeUnusedNS',
        'removeUnknownsAndDefaults',
        'removeTitle',
        'removeStyleElement',
        'removeRasterImages',
        'removeEmptyText',
        'removeOffCanvasPaths',
        'removeDoctype',
        'mergePaths',
        'minifyStyles',
      ],
    });

    return {
      ...item,
      content: data,
    };
  });
};

export async function processFiles(dirPath: string, logger: Logger): Promise<void[]> {
  const fileContents = await getFileContentsInDirectory(dirPath);

  logger.info(
    `Stage 3/4: Processing ${fileContents.length} SVG files (fill normalization + SVGO)...`,
  );

  const replacedFillContent = replaceFill(fileContents);

  const clearedContent = optimizeFiles(replacedFillContent);

  const result = await writeFiles(clearedContent);

  logger.info(`Stage 3/4 complete — ${clearedContent.length} files optimized`);

  return result;
}
