import { context, ENV } from '@ember/-internals/environment';
import { FEATURES } from '@ember/canary-features';
import * as _GlimmerSyntax from '@glimmer/syntax';
import VERSION from 'ember/version';

export const _Ember =
  (typeof (context.imports as any).Ember === 'object' && (context.imports as any).Ember) || {};

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
  buildCompileOptions as _buildCompileOptions,
  transformsFor as _transformsFor,
  registerPlugin,
  unregisterPlugin,
} from './lib/system/compile-options';
export { RESOLUTION_MODE_TRANSFORMS, STRICT_MODE_TRANSFORMS } from './lib/plugins/index';
export { EmberPrecompileOptions } from './lib/types';

export { preprocess as _preprocess, print as _print } from '@glimmer/syntax';
export { precompile as _precompile } from '@glimmer/compiler';

export { _GlimmerSyntax, VERSION };

// used to bootstrap templates
import './lib/system/bootstrap';

// add domTemplates initializer (only does something if `ember-template-compiler`
// is loaded already)
import './lib/system/initializer';
