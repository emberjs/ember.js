/**
@module ember
@submodule ember-htmlbars
*/

/**
  Returns a helper function that renders the provided ViewClass.

  Used internally by Ember.Handlebars.helper and other methods
  involving helper/component registration.

  @private
  @method makeViewHelper
  @param {Function} ViewClass view class constructor
  @since 1.2.0
*/
export default function makeViewHelper(ViewClass) {
  return {
    isLegacyViewHelper: true,
    isHTMLBars: true,
    viewClass: ViewClass
  };
}
