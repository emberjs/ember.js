import typescriptBlueprintPolyfill from 'ember-cli-typescript-blueprint-polyfill';
import { modulePrefixForProject } from '../-utils.js';

export default {
  description: 'Generates a service unit test.',

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
        return 'unit';
      },
    };
  },

  locals(options) {
    return {
      modulePrefix: modulePrefixForProject(options.project),
      friendlyTestDescription: ['Unit', 'Service', options.entity.name].join(' | '),
    };
  },
};
