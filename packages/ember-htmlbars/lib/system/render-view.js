import defaultEnv from "ember-htmlbars/env";
import ViewNodeManager, { createOrUpdateComponent } from "ember-htmlbars/node-managers/view-node-manager";

// This function only gets called once per render of a "root view" (`appendTo`). Otherwise,
// HTMLBars propagates the existing env and renders templates for a given render node.
export function renderHTMLBarsBlock(view, block, renderNode) {
  var env = {
    lifecycleHooks: [],
    renderedViews: [],
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
  createOrUpdateComponent(view, {}, renderNode, env);
  var nodeManager = new ViewNodeManager(view, null, renderNode, block, view.tagName !== '');

  nodeManager.render(env, {});
}
