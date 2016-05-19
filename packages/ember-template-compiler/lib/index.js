export { default as _Ember } from 'ember-metal'; // Is this still needed
export { default as precompile } from 'ember-template-compiler/system/precompile';
export { default as compile } from 'ember-template-compiler/system/compile';
export { default as registerPlugin } from 'ember-template-compiler/system/register-plugin';
export { default as defaultCompileOptions } from 'ember-template-compiler/system/compile-options';
// used for adding Ember.Handlebars.compile for backwards compat
import 'ember-template-compiler/compat';
