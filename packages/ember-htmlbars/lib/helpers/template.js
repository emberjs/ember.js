import Ember from "ember-metal/core"; // Ember.deprecate;

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
export function templateHelper(params, hash, options, env) {
  Ember.deprecate("The `template` helper has been deprecated in favor of the `partial` helper." +
                  " Please use `partial` instead, which will work the same way.");

  options.helperName = options.helperName || 'template';

  return env.helpers.partial.helperFunction.call(this, params, hash, options, env);
}
