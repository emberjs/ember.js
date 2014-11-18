import Ember from "ember-metal/core"; // Ember.assert

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
  function helperFunc(params, hash, options, env) {
    Ember.assert("You can only pass attributes (such as name=value) not bare " +
                 "values to a helper for a View found in '" + ViewClass.toString() + "'", params.length === 0);

    return env.helpers.view.call(this, [ViewClass], hash, options, env);
  }

  helperFunc._isHTMLBars = true;

  return helperFunc;
}
