import typescriptBlueprintPolyfill from 'ember-cli-typescript-blueprint-polyfill';

export default {
  description: 'Generates a controller.',

  shouldTransformTypeScript: true,

  init() {
    this._super && this._super.init.apply(this, arguments);
    typescriptBlueprintPolyfill(this);
  },

  normalizeEntityName: function (entityName) {
    return entityName.replace(/\.js$/, ''); //Prevent generation of ".js.js" files
  },
};
