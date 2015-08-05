/**
@module ember
@submodule ember-htmlbars
*/

/**
 @private
 @property helpers
*/
import Ember from 'ember-metal/core';
import EmptyObject from 'ember-metal/empty_object';

var helpers = new EmptyObject();

/**
@module ember
@submodule ember-htmlbars
*/

/**
  @private
  @method _registerHelper
  @for Ember.HTMLBars
  @param {String} name
  @param {Object|Function} helperFunc the helper function to add
*/
export function registerHelper(name, helperFunc) {
  helpers[name] = helperFunc;
}

export let deprecatedRegisterHelper = Ember.deprecateFunc(
  'Using Ember.HTMLBars._registerHelper is deprecated. Helpers (even dashless ones) are automatically resolved.',
  { id: 'ember-htmlbars.register-helper', until: '2.0.0' },
  registerHelper);

export default helpers;
