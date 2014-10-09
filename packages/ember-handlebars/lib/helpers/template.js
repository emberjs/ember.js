import Ember from "ember-metal/core"; // Ember.deprecate;

import EmberHandlebars from "ember-handlebars-compiler";
/**
@module ember
@submodule ember-handlebars
*/

/**
  @deprecated
  @method template
  @for Ember.Handlebars.helpers
  @param {String} templateName the template to render
*/
export default function templateHelper(name, options) {
  Ember.deprecate("The `template` helper has been deprecated in favor of the `partial` helper." +
                  " Please use `partial` instead, which will work the same way.");

  options.helperName = options.helperName || 'template';

  return EmberHandlebars.helpers.partial.apply(this, arguments);
}
