import Ember from "ember-metal/core"; // Ember.assert

import isNone from 'ember-metal/is_none';
import { bind } from "ember-handlebars/helpers/binding";

/**
@module ember
@submodule ember-handlebars
*/

/**
  The `partial` helper renders another template without
  changing the template context:

  ```handlebars
  {{foo}}
  {{partial "nav"}}
  ```

  The above example template will render a template named
  "_nav", which has the same context as the parent template
  it's rendered into, so if the "_nav" template also referenced
  `{{foo}}`, it would print the same thing as the `{{foo}}`
  in the above example.

  If a "_nav" template isn't found, the `partial` helper will
  fall back to a template named "nav".

  ## Bound template names

  The parameter supplied to `partial` can also be a path
  to a property containing a template name, e.g.:

  ```handlebars
  {{partial someTemplateName}}
  ```

  The above example will look up the value of `someTemplateName`
  on the template context (e.g. a controller) and use that
  value as the name of the template to render. If the resolved
  value is falsy, nothing will be rendered. If `someTemplateName`
  changes, the partial will be re-rendered using the new template
  name.


  @method partial
  @for Ember.Handlebars.helpers
  @param {String} partialName the name of the template to render minus the leading underscore
*/

export default function partialHelper(name, options) {
  var view = options.data.view;

  var context = (options.contexts && options.contexts.length) ? options.contexts[0] : this;

  options.helperName = options.helperName || 'partial';

  if (options.types[0] === "ID") {
    var partialNameStream = view.getStream(name);
    // Helper was passed a property path; we need to
    // create a binding that will re-render whenever
    // this property changes.
    options.fn = function(context, fnOptions) {
      renderPartial(context, partialNameStream.value(), fnOptions);
    };

    return bind.call(context, name, options, true, exists);
  } else {
    // Render the partial right into parent template.
    renderPartial(context, name, options);
  }
}

function exists(value) {
  return !isNone(value);
}

function renderPartial(context, name, options) {
  var nameParts = name.split("/");
  var lastPart = nameParts[nameParts.length - 1];

  nameParts[nameParts.length - 1] = "_" + lastPart;

  var view = options.data.view;
  var underscoredName = nameParts.join("/");
  var template = view.templateForName(underscoredName);
  var deprecatedTemplate = !template && view.templateForName(name);

  Ember.assert("Unable to find partial with name '"+name+"'.", !!template || !!deprecatedTemplate);

  template = template || deprecatedTemplate;

  template(context, {
    data: options.data
  });
}
