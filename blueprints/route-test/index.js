import path from 'node:path';
import stringUtil from 'ember-cli-string-utils';

import typescriptBlueprintPolyfill from 'ember-cli-typescript-blueprint-polyfill';
import { modulePrefixForProject } from '../-utils.js';

export default {
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
};
