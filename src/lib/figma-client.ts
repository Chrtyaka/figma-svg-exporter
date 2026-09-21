import type { GetFileResponse, GetImagesResponse } from '@figma/rest-api-spec';

const FIGMA_API_URL = 'https://api.figma.com/v1';

export type FileImagesParams = {
  ids: string[];
  format: 'svg' | 'png' | 'jpg' | 'pdf';
};

export type FigmaClient = {
  file(fileId: string): Promise<GetFileResponse>;
  fileImages(fileId: string, params: FileImagesParams): Promise<GetImagesResponse>;
};

export class FigmaApiError extends Error {
  constructor(
    readonly status: number,
    readonly retryAfter: string | null,
    message: string,
  ) {
    super(message);
    this.name = 'FigmaApiError';
  }
}

export function createFigmaClient(token: string): FigmaClient {
  const request = async <T>(pathname: string, params?: Record<string, string>): Promise<T> => {
    const url = new URL(`${FIGMA_API_URL}${pathname}`);

    for (const [key, value] of Object.entries(params ?? {})) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url, { headers: { 'X-Figma-Token': token } });

    if (!response.ok) {
      const body = await response.text().catch(() => '');

      throw new FigmaApiError(
        response.status,
        response.headers.get('retry-after'),
        `Figma API request failed: HTTP ${response.status} ${pathname}${body ? ` — ${body}` : ''}`,
      );
    }

    return (await response.json()) as T;
  };

  return {
    file: fileId => request(`/files/${encodeURIComponent(fileId)}`),
    fileImages: (fileId, { ids, format }) =>
      request(`/images/${encodeURIComponent(fileId)}`, { ids: ids.join(','), format }),
  };
}
