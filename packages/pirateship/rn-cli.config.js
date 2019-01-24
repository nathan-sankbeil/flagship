const path = require('path');
const fs = require('fs');
const blacklist = require('metro-config/src/defaults/blacklist');


function generateBlacklist() {
  const packageModules = path.resolve(__dirname, 'node_modules');
  const rootModules = path.resolve(__dirname, '../../node_modules');
  const duplicateModules = [];

  fs.readdirSync(packageModules).forEach(moduleDir => {
    if (moduleDir !== '.bin' && fs.existsSync(path.resolve(rootModules, moduleDir))) {
      duplicateModules.push(new RegExp('packages/.*/node_modules/' + moduleDir + '/.*'));
    }
  });

  return blacklist(duplicateModules);
}

const config = {
  watchFolders: [
    path.resolve(__dirname),
    path.resolve(__dirname, '../..')
  ],
  resolver: {
    blacklistRE: generateBlacklist()
  }
};

module.exports = config;
