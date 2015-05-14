/**
@module ember
@submodule ember-htmlbars
*/

import o_create from "ember-metal/platform/create";

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

export default helpers;
