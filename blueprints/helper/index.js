import normalizeEntityName from 'ember-cli-normalize-entity-name';

import typescriptBlueprintPolyfill from 'ember-cli-typescript-blueprint-polyfill';

export default {
  description: 'Generates a helper function.',

  shouldTransformTypeScript: true,

  init() {
    this._super && this._super.init.apply(this, arguments);
    typescriptBlueprintPolyfill(this);
  },

  normalizeEntityName: function (entityName) {
    return normalizeEntityName(
      entityName.replace(/\.js$/, '') //Prevent generation of ".js.js" files
    );
  },
};
