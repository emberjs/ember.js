/**
@module ember
@submodule ember-htmlbars
*/

import o_create from "ember-metal/platform/create";
import Ember from 'ember-metal/core';

/**
 @private
 @property helpers
*/
var helpers = o_create(null);

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
