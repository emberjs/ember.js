import ComponentNodeManager from "ember-htmlbars/node-managers/component-node-manager";

export default function componentHook(renderNode, env, scope, tagName, params, attrs, template, visitor) {
  var state = renderNode.state;

  // Determine if this is an initial render or a re-render
  if (state.manager) {
    state.manager.rerender(env, attrs, visitor);
    return;
  }

  var read = env.hooks.getValue;
  var parentView = read(env.view);

  var manager = ComponentNodeManager.create(renderNode, env, {
    tagName,
    params,
    attrs,
    parentView,
    template,
    parentScope: scope
  });

  state.manager = manager;

  manager.render(env, visitor);
}
