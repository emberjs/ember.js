/**
@module ember
@submodule ember-htmlbars
*/

/**
 @private
 @property helpers
*/
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

export default helpers;
