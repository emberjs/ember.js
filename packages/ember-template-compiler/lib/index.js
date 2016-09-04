import 'container';

export { default as _Ember } from 'ember-metal'; // Is this still needed
export { default as precompile } from './system/precompile';
export { default as compile } from './system/compile';
export {
  default as compileOptions,
  registerPlugin
} from './system/compile-options';
export { default as defaultPlugins } from './plugins';

// used for adding Ember.Handlebars.compile for backwards compat
import './compat';

// used to bootstrap templates
import './system/bootstrap';
