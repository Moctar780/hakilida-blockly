#!/usr/bin/env node
// Copy web frontend files to www/ for Tauri build (cross-platform)
import { cp, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dest = join(root, 'www');

const items = ['index.html', 'js', 'models', 'audio', 'sprites'];

async function copyWeb() {
  await mkdir(dest, { recursive: true });
  for (const item of items) {
    const src = join(root, item);
    if (existsSync(src)) {
      await cp(src, join(dest, item), { recursive: true, force: true });
    }
  }
  console.log('✓ Web assets copied to www/');
}

copyWeb().catch(err => {
  console.error('✗ Copy failed:', err);
  process.exit(1);
});
