#!/usr/bin/env node
/**
 * Copy the print-kiosk server source for bundling with Electron.
 * Copies source files, installs production deps, renames node_modules.
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const serverSrcDir = path.join(__dirname, '../server');
// Output to the caller's working directory (apps/staff/) when called from there
const serverDestDir = path.join(process.cwd(), 'dist/server');

const filesToCopy = [
  'index.ts',
  'package.json',
  'tsconfig.json',
  'controllers',
  'middleware',
  'routes',
  'services',
  'socket',
  'utils',
  'workers',
  'public',
];

const excludePatterns = [
  'node_modules',
  'dist',
  'temp',
  'data',
  '.env',
  '*.log',
  '*.db',
  'bun.lock',
  'package-lock.json',
];

function shouldExclude(name) {
  return excludePatterns.some(pattern => {
    if (pattern.includes('*')) {
      return new RegExp('^' + pattern.replace('*', '.*') + '$').test(name);
    }
    return name === pattern;
  });
}

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (shouldExclude(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function main() {
  console.log('Copying server source for production...');

  // Clean destination
  if (fs.existsSync(serverDestDir)) {
    fs.rmSync(serverDestDir, { recursive: true });
  }
  fs.mkdirSync(serverDestDir, { recursive: true });

  // Copy files
  for (const item of filesToCopy) {
    const srcPath = path.join(serverSrcDir, item);
    const destPath = path.join(serverDestDir, item);
    if (!fs.existsSync(srcPath)) {
      console.log(`  Skipping ${item} (not found)`);
      continue;
    }
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      console.log(`  Copying directory: ${item}`);
      copyDir(srcPath, destPath);
    } else {
      console.log(`  Copying file: ${item}`);
      const dir = path.dirname(destPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.copyFileSync(srcPath, destPath);
    }
  }

  // Create temp and data directories
  fs.mkdirSync(path.join(serverDestDir, 'temp'), { recursive: true });

  // Install production dependencies
  console.log('\nInstalling server dependencies...');
  try {
    execSync('bun install --production', { cwd: serverDestDir, stdio: 'inherit' });
  } catch {
    console.error('bun install failed, trying npm...');
    execSync('npm install --production --ignore-scripts', { cwd: serverDestDir, stdio: 'inherit' });
  }

  // Rename node_modules → _modules (electron-builder strips node_modules)
  const nmDir = path.join(serverDestDir, 'node_modules');
  const renamedDir = path.join(serverDestDir, '_modules');
  if (fs.existsSync(nmDir)) {
    fs.renameSync(nmDir, renamedDir);
    console.log('\nRenamed node_modules → _modules');
  }

  // Report size
  const getSize = (dir) => {
    let size = 0;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      size += entry.isDirectory() ? getSize(p) : fs.statSync(p).size;
    }
    return size;
  };
  console.log(`\nServer bundle size: ${(getSize(serverDestDir) / 1024 / 1024).toFixed(2)} MB`);
  console.log('Server copied successfully!');
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
