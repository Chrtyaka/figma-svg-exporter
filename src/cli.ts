import path from 'path';
import { existsSync, readFileSync } from 'fs';
import { Command } from 'commander';
import { exportFiles } from './index.js';
import type { ExporterConfig } from './types/config.js';
import pkg from '../package.json' assert { type: 'json' };

// ── Config file ──────────────────────────────────────────────────────────────

type ConfigFileShape = Partial<ExporterConfig> & { token?: string };

const CONFIG_CANDIDATES = [
  'figma-exporter.config.js',
  'figma-exporter.config.cjs',
  'figma-exporter.config.json',
] as const;

function findConfigFile(): string | null {
  for (const candidate of CONFIG_CANDIDATES) {
    if (existsSync(path.resolve(process.cwd(), candidate))) {
      return candidate;
    }
  }
  return null;
}

async function loadConfigFile(configPath: string, explicit: boolean): Promise<ConfigFileShape> {
  const abs = path.resolve(process.cwd(), configPath);

  if (!existsSync(abs)) {
    if (explicit) {
      console.error(`Error: Config file not found: ${configPath}`);
      process.exit(1);
    }
    return {};
  }

  try {
    if (configPath.endsWith('.json')) {
      return JSON.parse(readFileSync(abs, 'utf-8')) as ConfigFileShape;
    }

    const mod = await import(abs);
    return (mod.default ?? mod) as ConfigFileShape;
  } catch (err) {
    console.error(`Error: Failed to load config file "${configPath}":\n  ${String(err)}`);
    process.exit(1);
  }
}

// ── CLI action ───────────────────────────────────────────────────────────────

interface CliOptions {
  config?: string;
  token?: string;
  fileId?: string;
  output: string;
  canvas?: string;
  frame?: string;
  clear?: boolean;
  log: boolean; // false when --no-log is passed
}

async function run(options: CliOptions): Promise<void> {
  // 1. Load config file
  const configPath = options.config ?? findConfigFile();
  const fileConfig: ConfigFileShape = configPath
    ? await loadConfigFile(configPath, options.config != null)
    : {};

  // 2. Resolve token
  const token = options.token ?? process.env['FIGMA_TOKEN'] ?? fileConfig.token;
  if (!token) {
    console.error(
      'Error: Figma token is required.\n' +
        '  Set the FIGMA_TOKEN environment variable, use --token <token>,\n' +
        '  or add a "token" field to your config file.',
    );
    process.exit(1);
  }

  // 3. Resolve fileId
  const fileId = options.fileId ?? fileConfig.fileId;
  if (!fileId) {
    console.error(
      'Error: Figma file ID is required.\n' +
        '  Use --file-id <id> or set "fileId" in your config file.',
    );
    process.exit(1);
  }

  // 4. Build merged config (CLI flags override config file values)
  const config: ExporterConfig = {
    ...fileConfig,
    fileId,
    outputDir: options.output ?? fileConfig.outputDir ?? './svg-icons',
    ...(options.canvas != null && { canvas: options.canvas }),
    ...(options.frame != null && { frame: options.frame }),
    ...(options.clear && { clearOutputDir: true }),
    ...(options.log === false && { logger: false }),
  };

  // 5. Run export
  await exportFiles(token, config);
}

// ── Commander setup ──────────────────────────────────────────────────────────

const program = new Command();

program
  .name('figma-exporter')
  .description(
    'Export SVG icons from a Figma file with SVGO optimization and TypeScript type generation',
  )
  .version(pkg.version, '-v, --version', 'Print the version number')
  .helpOption('-h, --help', 'Display help information')
  .option(
    '-c, --config <path>',
    'Path to config file (default: figma-exporter.config.js | .cjs | .json)',
  )
  .option('-t, --token <token>', 'Figma personal access token (overrides FIGMA_TOKEN env var)')
  .option('-f, --file-id <id>', 'Figma file ID to export from')
  .option('-o, --output <dir>', 'Output directory for SVG files', './svg-icons')
  .option('--canvas <name>', 'Canvas (page) name to scope the search')
  .option('--frame <name>', 'Frame name within the canvas to scope the search')
  .option('--clear', 'Delete all files in the output directory before exporting')
  .option('--no-log', 'Suppress all log output')
  .action(run);

program.parse();
