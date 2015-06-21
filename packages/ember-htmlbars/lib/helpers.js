/**
@module ember
@submodule ember-htmlbars
*/

/**
 @private
 @property helpers
*/
var helpers = Object.create(null);

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
