var fs = require('fs');

module.exports = function generateFakePackageManifest(name, version) {
  if (!fs.existsSync('node_modules')) {
    fs.mkdirSync('node_modules');
  }
  if (!fs.existsSync('node_modules/' + name)) {
    fs.mkdirSync('node_modules/' + name);
  }
  fs.writeFileSync('node_modules/' + name + '/package.json', JSON.stringify({
    version: version,
  }));
};
