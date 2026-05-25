import fs from 'node:fs';
import path from 'node:path';
import pathUtil from 'ember-cli-path-utils';
import stringUtils from 'ember-cli-string-utils';

import typescriptBlueprintPolyfill from 'ember-cli-typescript-blueprint-polyfill';
import { modulePrefixForProject } from '../-utils.js';

export default {
  description: 'Generates an acceptance test for a feature.',

  shouldTransformTypeScript: true,

  init() {
    this._super && this._super.init.apply(this, arguments);
    typescriptBlueprintPolyfill(this);
  },

  locals: function (options) {
    let testFolderRoot = stringUtils.dasherize(options.project.name());

    if (options.project.isEmberCLIAddon()) {
      testFolderRoot = pathUtil.getRelativeParentPath(options.entity.name, -1, false);
    }

    let destroyAppExists = fs.existsSync(
      path.join(this.project.root, '/tests/helpers/destroy-app.js')
    );

    let friendlyTestName = [
      'Acceptance',
      stringUtils.dasherize(options.entity.name).replace(/[-]/g, ' '),
    ].join(' | ');

    return {
      modulePrefix: modulePrefixForProject(options.project),
      testFolderRoot,
      friendlyTestName,
      destroyAppExists,
    };
  },
};
