import { readFileSync, writeFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf-8')) as {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

const external = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
];

// ── Library ──────────────────────────────────────────────────────────────────
const libResult = await Bun.build({
  entrypoints: ['src/index.ts'],
  outdir: 'dist',
  format: 'cjs',
  target: 'node',
  external,
});

// ── CLI ───────────────────────────────────────────────────────────────────────
const cliResult = await Bun.build({
  entrypoints: ['src/cli.ts'],
  outdir: 'dist',
  format: 'esm',
  target: 'node',
  external,
});

// Prepend shebang — Bun.build does not have a banner option
if (cliResult.success) {
  const cliPath = 'dist/cli.js';
  writeFileSync(cliPath, `#!/usr/bin/env node\n${readFileSync(cliPath, 'utf-8')}`);
}

// ── Report ────────────────────────────────────────────────────────────────────
let failed = false;

for (const result of [libResult, cliResult]) {
  if (!result.success) {
    failed = true;
    for (const log of result.logs) {
      console.error(log);
    }
  }
}

if (failed) process.exit(1);

console.log('Build complete: dist/index.js, dist/cli.js');
