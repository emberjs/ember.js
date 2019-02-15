'use strict';

const path = require('path');
const stringUtil = require('ember-cli-string-utils');
const pathUtil = require('ember-cli-path-utils');
const getPathOption = require('ember-cli-get-component-path-option');
const normalizeEntityName = require('ember-cli-normalize-entity-name');
const useEditionDetector = require('../edition-detector');
const isModuleUnificationProject = require('../module-unification').isModuleUnificationProject;
const EOL = require('os').EOL;

module.exports = useEditionDetector({
  description: 'Generates a component.',

  availableOptions: [
    {
      name: 'path',
      type: String,
      default: 'components',
      aliases: [{ 'no-path': '' }],
    },
  ],

  fileMapTokens: function() {
    if (isModuleUnificationProject(this.project)) {
      return {
        __name__: function() {
          return 'component';
        },
        __root__(options) {
          if (options.inRepoAddon) {
            return path.join('packages', options.inRepoAddon, 'src');
          }
          if (options.inDummy) {
            return path.join('tests', 'dummy', 'src');
          }
          return 'src';
        },
        __path__(options) {
          return path.join('ui', 'components', options.dasherizedModuleName);
        },
        __templatepath__(options) {
          return path.join('ui', 'components', options.dasherizedModuleName);
        },
        __templatename__: function() {
          return 'template';
        },
      };
    } else {
      return {
        __path__: function(options) {
          if (options.pod) {
            return path.join(options.podPath, options.locals.path, options.dasherizedModuleName);
          } else {
            return 'components';
          }
        },
        __templatepath__: function(options) {
          if (options.pod) {
            return path.join(options.podPath, options.locals.path, options.dasherizedModuleName);
          }
          return 'templates/components';
        },
        __templatename__: function(options) {
          if (options.pod) {
            return 'template';
          }
          return options.dasherizedModuleName;
        },
      };
    }
  },

  normalizeEntityName: function(entityName) {
    return normalizeEntityName(entityName);
  },

  locals: function(options) {
    let templatePath = '';
    let importTemplate = '';
    let contents = '';

    if (!isModuleUnificationProject(this.project)) {
      // if we're in an addon, build import statement
      if (options.project.isEmberCLIAddon() || (options.inRepoAddon && !options.inDummy)) {
        if (options.pod) {
          templatePath = './template';
        } else {
          templatePath =
            pathUtil.getRelativeParentPath(options.entity.name) +
            'templates/components/' +
            stringUtil.dasherize(options.entity.name);
        }
        importTemplate = "import layout from '" + templatePath + "';" + EOL;
        contents = EOL + '  layout';
      }
    }

    return {
      importTemplate: importTemplate,
      contents: contents,
      path: getPathOption(options),
    };
  },
});
