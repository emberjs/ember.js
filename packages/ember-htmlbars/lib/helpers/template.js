import Ember from "ember-metal/core"; // Ember.deprecate;
import helpers from "ember-htmlbars/helpers";

/**
@module ember
@submodule ember-htmlbars
*/

/**
  @deprecated
  @method template
  @for Ember.Handlebars.helpers
  @param {String} templateName the template to render
*/
export function templateHelper(params, options, env) {
  Ember.deprecate("The `template` helper has been deprecated in favor of the `partial` helper." +
                  " Please use `partial` instead, which will work the same way.");

  options.helperName = options.helperName || 'template';

  helpers.partial.call(this, params, options, env);
}
