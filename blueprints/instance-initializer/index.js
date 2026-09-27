import typescriptBlueprintPolyfill from 'ember-cli-typescript-blueprint-polyfill';

export default {
  shouldTransformTypeScript: true,

  description: 'Generates an instance initializer.',

  init() {
    this._super && this._super.init.apply(this, arguments);
    typescriptBlueprintPolyfill(this);
  },
};
