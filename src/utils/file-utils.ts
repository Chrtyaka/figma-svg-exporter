import { lstat, readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync, readdirSync, rmSync } from 'fs';
import { SavedFileWithoutContent, SavedFile } from '../types/files';

export async function getFilesFromDirectory(directory: string): Promise<SavedFileWithoutContent[]> {
  const contents = await readdir(directory);

  const contentsLStat = await Promise.all(
    contents.map(async item => {
      const filePath = `${directory}/${item}`;
      const fileStats = await lstat(filePath);
      return {
        fileName: item,
        filePath,
        fileStats,
      };
    }),
  );

  return contentsLStat
    .filter(item => item.fileStats.isFile())
    .map(({ fileName, filePath }) => {
      return { fileName, filePath };
    });
}

export async function getFileContentsInDirectory(directory: string) {
  const files = await getFilesFromDirectory(directory);

  const svgFiles = files.filter(item => item.fileName.endsWith('.svg'));

  return Promise.all(
    svgFiles.map(async (item): Promise<SavedFile> => {
      const body = await readFile(item.filePath);

      return {
        ...item,
        content: body.toString(),
      };
    }),
  );
}

export async function writeFiles(files: SavedFile[]): Promise<void[]> {
  const promises = files.map(item => {
    return writeFile(item.filePath, item.content);
  });

  return Promise.all(promises);
}

export async function createDirectory(path: string): Promise<unknown> {
  const exist = existsSync(path);

  if (exist) {
    return null;
  }

  return mkdir(path);
}

export function cleanDirectory(path: string) {
  readdirSync(path).forEach(f => rmSync(`${path}/${f}`));
}
