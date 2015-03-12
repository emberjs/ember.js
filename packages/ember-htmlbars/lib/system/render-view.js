import Ember from "ember-metal/core";
import defaultEnv from "ember-htmlbars/env";
import { get } from "ember-metal/property_get";
import ComponentNode, { createOrUpdateComponent } from "ember-htmlbars/system/component-node";

export default function renderView(view, buffer, template) {
  if (!template) {
    return;
  }

  var output;

  Ember.assert('template must be a function. Did you mean to call Ember.Handlebars.compile("...") or specify templateName instead?', typeof template === 'function');
  output = renderLegacyTemplate(view, buffer, template);

  if (output !== undefined) {
    buffer.push(output);
  }
}

// This function only gets called once per render of a "root view" (`appendTo`). Otherwise,
// HTMLBars propagates the existing env and renders templates for a given render node.
export function renderHTMLBarsBlock(view, block, renderNode) {
  var env = {
    lifecycleHooks: [],
    view: view,
    outletState: view.outletState,
    container: view.container,
    renderer: view.renderer,
    dom: view.renderer._dom,
    hooks: defaultEnv.hooks,
    helpers: defaultEnv.helpers,
    useFragmentCache: defaultEnv.useFragmentCache
  };

  view.env = env;
  createOrUpdateComponent(view, {}, renderNode);
  var componentNode = new ComponentNode(view, null, renderNode, block, true);

  componentNode.render(env, {});
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
