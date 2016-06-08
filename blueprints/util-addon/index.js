/*jshint node:true*/

var stringUtil    = require('ember-cli-string-utils');
var path          = require('path');
var getPathOption = require('ember-cli-get-component-path-option');

module.exports = {
  description: 'Generates a simple utility module/function.',
  fileMapTokens: function() {
    return {
      __name__: function(options) {
        return options.dasherizedModuleName;
      },
      __root__: function(options) {
        if (options.inRepoAddon) {
          return path.join('lib', options.inRepoAddon, 'app');
        }
        return 'app';
      }
    };
  },
  locals: function(options) {
    var addonRawName   = options.inRepoAddon ? options.inRepoAddon : options.project.name();
    var addonName      = stringUtil.dasherize(addonRawName);
    var fileName       = stringUtil.dasherize(options.entity.name);
    var modulePath       = [addonName, 'utils', fileName].join('/');

    return {
      modulePath: modulePath,
      path: getPathOption(options)
    };
  }

};
