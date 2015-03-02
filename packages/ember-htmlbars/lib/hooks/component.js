import ComponentNode from "ember-htmlbars/system/component-node";

export default function componentHook(renderNode, env, scope, tagName, attrs, template, visitor) {
  var state = renderNode.state;
  // Determine if this is an initial render or a re-render
  if (state.componentNode) {
    state.componentNode.rerender(env, attrs, visitor);
    return;
  }

  var read = env.hooks.getValue;
  var parentView = read(env.view);

  var componentNode = state.componentNode =
    ComponentNode.create(renderNode, env, attrs, undefined, parentView, tagName,
                         scope, template, visitor);

  componentNode.render(env, attrs, visitor);
}

