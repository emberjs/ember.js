import Ember from "ember-metal/core";
import { get } from "ember-metal/property_get";
import defaultEnv from "ember-htmlbars/env";

export default function renderView(view, buffer, template) {
  if (!template) {
    return;
  }

  var output;

  if (template.isHTMLBars) {
    Ember.assert('template must be an object. Did you mean to call Ember.Handlebars.compile("...") or specify templateName instead?', typeof template === 'object');
    output = renderHTMLBarsTemplate(view, buffer, template);
  } else {
    Ember.assert('template must be a function. Did you mean to call Ember.Handlebars.compile("...") or specify templateName instead?', typeof template === 'function');
    output = renderLegacyTemplate(view, buffer, template);
  }

  if (output !== undefined) {
    buffer.push(output);
  }
}

function renderHTMLBarsTemplate(view, buffer, template) {
  Ember.assert(
    'The template being rendered by `' + view + '` was compiled with `' + template.revision +
    '` which does not match `Ember@VERSION_STRING_PLACEHOLDER` (this revision).',
    template.revision === 'Ember@VERSION_STRING_PLACEHOLDER'
  );

  var contextualElement = buffer.innerContextualElement();
  var args = view._blockArguments;
  var env = {
    view: this,
    dom: view.renderer._dom,
    hooks: defaultEnv.hooks,
    helpers: defaultEnv.helpers,
    useFragmentCache: defaultEnv.useFragmentCache,
    data: {
      view: view,
      buffer: buffer
    }
  };

  return template.render(view, env, { contextualElement: contextualElement }, args).fragment;
}

function renderLegacyTemplate(view, buffer, template) {
  var context = get(view, 'context');
  var options = {
    data: {
      view: view,
      buffer: buffer
    }
  };

  return template(context, options);
}
