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

import Helper from "ember-htmlbars/system/helper";

/**
  @private
  @method _registerHelper
  @for Ember.HTMLBars
  @param {String} name
  @param {Object|Function} helperFunc the helper function to add
*/
export function registerHelper(name, helperFunc) {
  var helper;

  if (helperFunc && helperFunc.isHelper) {
    helper = helperFunc;
  } else {
    helper = new Helper(helperFunc);
  }

  helpers[name] = helper;
}

export default helpers;
