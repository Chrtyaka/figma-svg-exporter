# figma-svg-exporter

Export SVG icons from a Figma file to a local directory — with SVGO optimization, `fill` → `currentColor` normalization, and automatic TypeScript type generation.

## What it does

1. Fetches components (or instances) from a Figma file, optionally scoped to a canvas and frame
2. Downloads their SVG exports via the Figma API in sequential batches
3. Optimizes each SVG with SVGO and normalizes hardcoded fill colors to `currentColor`
4. Generates a TypeScript union type from the exported filenames

**Output example** — alongside the SVG files, a `types.ts` is written to the output directory:

```ts
export type SvgIcons =
  | "arrow-left"
  | "arrow-right"
  | "check"
  | "close"
  | "spinner";
```

## Installation

```bash
# One-off run without installing
npx figma-exporter --file-id <FILE_ID> --output ./src/assets/icons

# Dev dependency (recommended)
bun add -d figma-exporter
# or
npm install --save-dev figma-exporter
```

## Quick start

**1. Create a config file** in the project root:

```js
// figma-exporter.config.js
export default {
  fileId: "your-figma-file-id", // from the Figma URL
  outputDir: "./src/assets/icons",
  canvas: "Icons", // page name in Figma
  frame: "Export", // frame name inside that page
  clearOutputDir: true,
};
```

**2. Set your Figma token:**

```bash
export FIGMA_TOKEN=your_personal_access_token
```

> Generate a token in Figma → Account Settings → Personal access tokens.

**3. Run:**

```bash
npx figma-exporter
# or, if installed locally:
bun figma-exporter
```

## CLI reference

```
figma-exporter [options]
```

| Flag                 | Short | Default         | Description                                  |
| -------------------- | ----- | --------------- | -------------------------------------------- |
| `--config <path>`    | `-c`  | auto-discovered | Path to config file                          |
| `--token <token>`    | `-t`  | `$FIGMA_TOKEN`  | Figma personal access token                  |
| `--file-id <id>`     | `-f`  | —               | Figma file ID (required)                     |
| `--output <dir>`     | `-o`  | `./svg-icons`   | Output directory                             |
| `--canvas <name>`    |       | —               | Canvas (page) name to scope the search       |
| `--frame <name>`     |       | —               | Frame name within the canvas                 |
| `--clear`            |       | `false`         | Delete all files in output dir before export |
| `--type-name <name>` |       | `SvgIcons`      | Name for the generated TypeScript union type |
| `--no-log`           |       | —               | Suppress all log output                      |
| `--version`          | `-v`  |                 | Print version                                |
| `--help`             | `-h`  |                 | Display help                                 |

CLI flags override values from the config file. Advanced options (retry, concurrency, etc.) are config-file-only.

## Config file

The config file is optional — all required fields can be passed as CLI flags. When present, it is loaded with dynamic `import()`.

Supported filenames (searched in order in the current working directory):

```
figma-exporter.config.js
figma-exporter.config.cjs
figma-exporter.config.json
```

A custom path can be set with `--config ./path/to/config.js`.

### Full config reference

| Option                | Type                                   | Default        | CLI flag      | Description                                          |
| --------------------- | -------------------------------------- | -------------- | ------------- | ---------------------------------------------------- |
| `token`               | `string`                               | —              | `--token`     | Figma personal access token (alternative to env var) |
| `fileId`              | `string`                               | —              | `--file-id`   | Figma file ID (found in the file URL)                |
| `outputDir`           | `string`                               | `./svg-icons`  | `--output`    | Directory where SVG files are written                |
| `canvas`              | `string`                               | —              | `--canvas`    | Canvas (page) name to scope the search               |
| `frame`               | `string`                               | —              | `--frame`     | Frame name within the canvas                         |
| `entityTypeForExport` | `'components' \| 'instances' \| Array` | `'components'` | —             | Which node types to export                           |
| `component`           | `string \| (node) => boolean`          | —              | —             | Filter entities by name or a custom predicate        |
| `batchSize`           | `number`                               | `100`          | —             | Nodes per `fileImages` API request                   |
| `clearOutputDir`      | `boolean`                              | `false`        | `--clear`     | Delete existing files before writing                 |
| `retryAttempts`       | `number`                               | `3`            | —             | Max retry attempts on API 429 responses              |
| `retryDelay`          | `number`                               | `1000`         | —             | Initial backoff delay in ms (doubles each attempt)   |
| `requestDelay`        | `number`                               | `0`            | —             | Delay in ms between sequential batch requests        |
| `downloadConcurrency` | `number`                               | `5`            | —             | Max concurrent SVG downloads                         |
| `typeName`            | `string`                               | `SvgIcons`     | `--type-name` | Name for the generated TypeScript union type         |
| `logger`              | `Logger \| false \| null`              | built-in       | —             | Custom logger or `false`/`null` to disable           |

**Example with all options:**

```js
// figma-exporter.config.js
export default {
  fileId: "abc123xyz",
  outputDir: "./src/assets/icons",
  canvas: "Icons",
  frame: "Export",
  entityTypeForExport: "components",
  clearOutputDir: true,

  typeName: "IconName",

  // API resilience
  batchSize: 50,
  retryAttempts: 5,
  retryDelay: 2000,
  requestDelay: 200,
  downloadConcurrency: 10,
};
```

## Environment variables

| Variable      | Description                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------------- |
| `FIGMA_TOKEN` | Figma personal access token. Lower priority than `--token`, higher than `token` in config file. |

## Programmatic API

```ts
import { exportFiles } from "figma-exporter";

await exportFiles(process.env.FIGMA_TOKEN!, {
  fileId: "abc123xyz",
  outputDir: "./src/assets/icons",
  canvas: "Icons",
  frame: "Export",
  clearOutputDir: true,
});
```

### Exported types

```ts
import type { Logger, LoggerOption } from "figma-exporter";
import { consoleLogger } from "figma-exporter";
```

## Logger customization

By default the built-in console logger prints colored output prefixed with `[figma-exporter]`:

```
[figma-exporter] > Stage 1/4: Fetching Figma file abc123...
[figma-exporter] > Found 142 components to export
[figma-exporter] > Requesting SVG export URLs in 2 batch(es) of up to 100...
[figma-exporter] > Stage 2/4: Downloading 142 SVG files to /src/assets/icons...
[figma-exporter] > Stage 3/4: Processing 142 SVG files (fill normalization + SVGO)...
[figma-exporter] > Stage 4/4: Generating TypeScript union type "SvgIcons"...
[figma-exporter] > Export finished successfully
```

**Disable logging:**

```ts
await exportFiles(token, { ...config, logger: false });
```

```bash
figma-exporter --no-log
```

**Custom logger** — any object with `info`, `warn`, and `error` methods works:

```ts
import type { Logger } from "figma-exporter";

const logger: Logger = {
  info: (msg) => myLogger.info(msg),
  warn: (msg) => myLogger.warn(msg),
  error: (msg) => myLogger.error(msg),
};

await exportFiles(token, { ...config, logger });
```

This is compatible with `pino`, `winston`, `consola`, and any other popular logger out of the box.
