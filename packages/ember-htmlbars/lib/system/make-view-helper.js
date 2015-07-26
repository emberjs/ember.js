import Ember from 'ember-metal/core';

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
  Ember.deprecate(
    '`Ember.Handlebars.makeViewHelper` and `Ember.HTMLBars.makeViewHelper` are deprecated. Please refactor to normal component usage.',
    false,
    { id: 'ember-htmlbars.make-view-helper', until: '2.0.0' }
  );

  return {
    isLegacyViewHelper: true,
    isHTMLBars: true,
    viewClass: ViewClass
  };
}
