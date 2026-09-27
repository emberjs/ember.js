import typescriptBlueprintPolyfill from 'ember-cli-typescript-blueprint-polyfill';

export default {
  description: 'Generates an initializer.',

  shouldTransformTypeScript: true,

  init() {
    this._super && this._super.init.apply(this, arguments);
    typescriptBlueprintPolyfill(this);
  },
};
