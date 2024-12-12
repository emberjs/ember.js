'use strict';

const path = require('path');
const stringUtil = require('ember-cli-string-utils');

const useTestFrameworkDetector = require('../test-framework-detector');
const typescriptBlueprintPolyfill = require('ember-cli-typescript-blueprint-polyfill');
const { modulePrefixForProject } = require('../-utils');

module.exports = useTestFrameworkDetector({
  description: 'Generates a route unit test.',

  shouldTransformTypeScript: true,

  init() {
    this._super && this._super.init.apply(this, arguments);
    typescriptBlueprintPolyfill(this);
  },

  availableOptions: [
    {
      name: 'reset-namespace',
      type: Boolean,
    },
  ],

  fileMapTokens: function () {
    return {
      __root__() {
        return 'tests';
      },
      __testType__() {
        return 'unit';
      },
      __test__: function (options) {
        let moduleName = options.locals.moduleName;

        if (options.pod) {
          moduleName = 'route';
        }

        return `${moduleName}-test`;
      },
      __path__: function (options) {
        if (options.pod) {
          return path.join(options.podPath, options.locals.moduleName);
        }
        return 'routes';
      },
    };
  },

  locals: function (options) {
    let moduleName = options.entity.name;

    if (options.resetNamespace) {
      moduleName = moduleName.split('/').pop();
    }

    return {
      modulePrefix: modulePrefixForProject(options.project),
      friendlyTestDescription: ['Unit', 'Route', options.entity.name].join(' | '),
      moduleName: stringUtil.dasherize(moduleName),
    };
  },
});
