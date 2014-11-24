import Ember from "ember-metal/core"; // Ember.assert

import isNone from 'ember-metal/is_none';
import { bind } from "./binding";

/**
@module ember
@submodule ember-htmlbars
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

export function partialHelper(params, hash, options, env) {
  options.helperName = options.helperName || 'partial';

  var name = params[0];

  if (name && name.isStream) {
    options.render = createPartialTemplate(name);
    bind.call(this, name, hash, options, env, true, exists);
  } else {
    return renderPartial(name, this, env, options.morph.contextualElement);
  }
}

function exists(value) {
  return !isNone(value);
}

function lookupPartial(view, templateName) {
  var nameParts = templateName.split("/");
  var lastPart = nameParts[nameParts.length - 1];

  nameParts[nameParts.length - 1] = "_" + lastPart;

  var underscoredName = nameParts.join('/');
  var template = view.templateForName(underscoredName);
  if (!template) {
    template = view.templateForName(templateName);
  }

  Ember.assert('Unable to find partial with name "'+templateName+'"', !!template);

  return template;
}

function renderPartial(name, view, env, contextualElement) {
  var template = lookupPartial(view, name);
  return template(view, env, contextualElement);
}

function createPartialTemplate(nameStream) {
  return function(view, env, contextualElement) {
    return renderPartial(nameStream.value(), view, env, contextualElement);
  };
}