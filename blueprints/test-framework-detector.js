var path = require('path');

module.exports = function(blueprint) {
  blueprint.supportsAddon = function() {
    return false;
  };

  blueprint.filesPath = function() {
    var type;

    var dependencies = this.project.dependencies();
    if ('ember-cli-qunit' in dependencies) {
      type = 'qunit';
    } else if ('ember-cli-mocha' in dependencies) {
      type = 'mocha';
    } else {
      this.ui.writeLine('Couldn\'t determine test style - using QUnit');
      type = 'qunit';
    }

    return path.join(this.path, type + '-files');
  };

  return blueprint;
};
