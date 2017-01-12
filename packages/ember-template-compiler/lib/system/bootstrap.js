/**
@module ember
@submodule ember-templates
*/

import { Error as EmberError } from 'ember-metal';
import compile from './compile';

/**
  Find templates stored in the head tag as script tags and make them available
  to `Ember.CoreView` in the global `Ember.TEMPLATES` object.

  Script tags with `text/x-handlebars` will be compiled
  with Ember's template compiler and are suitable for use as a view's template.

  @private
  @method bootstrap
  @for Ember.HTMLBars
  @static
  @param ctx
*/
function bootstrap({ context, hasTemplate, setTemplate }) {
  if (!context) {
    context = document;
  }

  let selector = 'script[type="text/x-handlebars"]';

  let elements = context.querySelectorAll(selector);

  for (let i = 0; i < elements.length; i++) {
    let script = elements[i];

    // Get the name of the script
    // First look for data-template-name attribute, then fall back to its
    // id if no name is found.
    let templateName = script.getAttribute('data-template-name') || script.getAttribute('id') || 'application';
    let template;

    template = compile(script.innerHTML, {
      moduleName: templateName
    });

    // Check if template of same name already exists.
    if (hasTemplate(templateName)) {
      throw new EmberError(`Template named "${templateName}" already exists.`);
    }

    // For templates which have a name, we save them and then remove them from the DOM.
    setTemplate(templateName, template);

    // Remove script tag from DOM.
    script.parentNode.removeChild(script);
  }
}

export default bootstrap;
