const Funnel = require('broccoli-funnel');

module.exports = function rename(tree, mappings) {
  return new Funnel(tree, {
    getDestinationPath(relativePath) {
      let alias = mappings[relativePath];

      if (alias) {
        return alias;
      }

      return relativePath;
    }
  });
};
