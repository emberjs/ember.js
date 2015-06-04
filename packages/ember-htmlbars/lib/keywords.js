/**
@module ember
@submodule ember-htmlbars
*/

import { hooks } from "htmlbars-runtime";
import o_create from "ember-metal/platform/create";

/**
 @private
 @property helpers
*/
var keywords = o_create(hooks.keywords);

/**
@module ember
@submodule ember-htmlbars
*/

/**
  @private
  @method _registerHelper
  @for Ember.HTMLBars
  @param {String} name
  @param {Object|Function} keyword the keyword to add
*/
export function registerKeyword(name, keyword) {
  keywords[name] = keyword;
}

export default keywords;
