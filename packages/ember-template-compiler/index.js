import { FEATURES } from '@ember/canary-features';
import { ENV, context } from 'ember-environment';
import VERSION from 'ember/version';

export const _Ember = (typeof context.imports.Ember === 'object' && context.imports.Ember) || {};

// private API used by ember-cli-htmlbars to setup ENV and FEATURES
if (!_Ember.ENV) {
  _Ember.ENV = ENV;
}
if (!_Ember.FEATURES) {
  _Ember.FEATURES = FEATURES;
}
if (!_Ember.VERSION) {
  _Ember.VERSION = VERSION;
}

// used for adding Ember.Handlebars.compile for backwards compat
import setupGlobal from './lib/compat';
setupGlobal(_Ember);

export { default as precompile } from './lib/system/precompile';
export { default as compile } from './lib/system/compile';
export {
  default as compileOptions,
  registerPlugin,
  unregisterPlugin,
} from './lib/system/compile-options';
export { default as defaultPlugins } from './lib/plugins/index';

// used to bootstrap templates
import './lib/system/bootstrap';

// add domTemplates initializer (only does something if `ember-template-compiler`
// is loaded already)
import './lib/system/initializer';
