import ViewNodeManager, { createOrUpdateComponent } from 'ember-htmlbars/node-managers/view-node-manager';
import RenderEnv from 'ember-htmlbars/system/render-env';

// This function only gets called once per render of a "root view" (`appendTo`). Otherwise,
// HTMLBars propagates the existing env and renders templates for a given render node.
export function renderHTMLBarsBlock(view, block, renderNode) {
  var env = RenderEnv.build(view);

  view.env = env;
  createOrUpdateComponent(view, {}, null, renderNode, env);
  var nodeManager = new ViewNodeManager(view, null, renderNode, block, view.tagName !== '');

  nodeManager.render(env, {});
}
