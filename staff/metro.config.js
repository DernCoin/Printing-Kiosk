const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Exclude Electron build artifacts and native Android/iOS dirs from Metro bundling
config.resolver.blockList = [
  /dist\/electron\/.*/,
  /dist\/web\/.*/,
  /dist\/server\/.*/,
  /electron\/.*/,
  /release\/.*/,
  /android\/.*/,
  /ios\/.*/,
  /keys\/.*/,
];

module.exports = config;
