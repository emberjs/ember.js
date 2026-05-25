import fs from 'node:fs';
import path from 'node:path';

import typescriptBlueprintPolyfill from 'ember-cli-typescript-blueprint-polyfill';
import { modulePrefixForProject } from '../-utils.js';

export default {
  description: 'Generates an instance initializer unit test.',

  shouldTransformTypeScript: true,

  init() {
    this._super && this._super.init.apply(this, arguments);
    typescriptBlueprintPolyfill(this);
  },

  fileMapTokens: function () {
    return {
      __root__() {
        return 'tests';
      },
      __testType__() {
        return 'unit';
      },
    };
  },
  locals: function (options) {
    return {
      friendlyTestName: ['Unit', 'Instance Initializer', options.entity.name].join(' | '),
      modulePrefix: modulePrefixForProject(options.project),
      destroyAppExists: fs.existsSync(
        path.join(this.project.root, '/tests/helpers/destroy-app.js')
      ),
    };
  },
};
