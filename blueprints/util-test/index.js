import path from 'node:path';

import typescriptBlueprintPolyfill from 'ember-cli-typescript-blueprint-polyfill';
import { modulePrefixForProject } from '../-utils.js';

export default {
  description: 'Generates a util unit test.',

  shouldTransformTypeScript: true,

  init() {
    this._super && this._super.init.apply(this, arguments);
    typescriptBlueprintPolyfill(this);
  },

  fileMapTokens() {
    return {
      __root__() {
        return 'tests';
      },
      __testType__() {
        return path.join('unit', 'utils');
      },
    };
  },

  locals: function (options) {
    return {
      friendlyTestName: ['Unit', 'Utility', options.entity.name].join(' | '),
      modulePrefix: modulePrefixForProject(options.project),
    };
  },
};
