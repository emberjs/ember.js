import ComponentNode from "ember-htmlbars/node-managers/component-node-manager";

export default function componentHook(renderNode, env, scope, tagName, attrs, template, visitor) {
  var state = renderNode.state;

  // Determine if this is an initial render or a re-render
  if (state.manager) {
    state.manager.rerender(env, attrs, visitor);
    return;
  }

  var read = env.hooks.getValue;
  var parentView = read(env.view);

  var manager = state.manager =
    ComponentNode.create(renderNode, env, attrs, undefined, parentView, tagName,
                         scope, template, visitor);

  manager.render(env, attrs, visitor);
}
