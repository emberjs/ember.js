import _Ember from 'ember-metal';
import * as FLAGS from 'ember/features';
import { ENV } from 'ember-environment';
import VERSION from 'ember/version';

// private API used by ember-cli-htmlbars to setup ENV and FEATURES
if (!_Ember.ENV) { _Ember.ENV = ENV; }
if (!_Ember.FEATURES) { _Ember.FEATURES = FLAGS.FEATURES; }
if (!_Ember.VERSION) { _Ember.VERSION = VERSION; }

export { _Ember };

export { default as precompile } from './system/precompile';
export { default as compile } from './system/compile';
export {
  default as compileOptions,
  registerPlugin,
  unregisterAllPlugins
} from './system/compile-options';
export { default as defaultPlugins } from './plugins';

// used for adding Ember.Handlebars.compile for backwards compat
import './compat';

// used to bootstrap templates
import './system/bootstrap';
