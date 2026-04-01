#!/usr/bin/env node
/**
 * Post-pack hook for electron-builder.
 * Renames _modules back to node_modules in the packed output.
 * Required because electron-builder strips node_modules from extraResources.
 */

const path = require('path');
const fs = require('fs');

exports.default = async function afterPack(context) {
  const appOutDir = context.appOutDir;
  const resourcesDir = path.join(appOutDir, 'resources');

  // Find _modules directories and rename back to node_modules
  const serverDir = path.join(resourcesDir, 'server');
  const renamedDir = path.join(serverDir, '_modules');
  const nodeModulesDir = path.join(serverDir, 'node_modules');

  if (fs.existsSync(renamedDir)) {
    fs.renameSync(renamedDir, nodeModulesDir);
    console.log('[after-pack] Renamed _modules → node_modules in server');
  } else {
    console.log('[after-pack] No _modules found to rename');
  }

  // Ensure Bun binary is executable
  const bunPath = path.join(resourcesDir, 'bin', 'linux', 'x64', 'bun');
  if (fs.existsSync(bunPath)) {
    fs.chmodSync(bunPath, 0o755);
    console.log('[after-pack] Made Bun binary executable');
  }
};
