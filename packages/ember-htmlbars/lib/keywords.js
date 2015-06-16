/**
@module ember
@submodule ember-htmlbars
*/

import { hooks } from 'htmlbars-runtime';

/**
 @private
 @property helpers
*/
var keywords = Object.create(hooks.keywords);

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
