#!/usr/bin/env node

/**
 * Tracy CLI Launcher.
 * Spawns CLI via npx tsx across environments safely.
 */
import { spawn } from 'node:child_process';
import * as path from 'node:path';
import * as url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const cliEntry = path.resolve(__dirname, '../cli/index.ts');

const child = spawn(
  'npx',
  ['tsx', cliEntry, ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    env: process.env,
    shell: true,
  }
);

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (err) => {
  process.stderr.write(`Failed to launch tracy CLI: ${err.message}\n`);
  process.exit(1);
});


