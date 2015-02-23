import ComponentNode from "ember-htmlbars/system/component-node";
import { componentClassSymbol, componentLayoutSymbol } from "ember-htmlbars/system/component-node";

export default function componentHook(renderNode, env, scope, tagName, attrs, template, visitor) {
  var state = renderNode.state;
  // Determine if this is an initial render or a re-render
  if (state.componentNode) {
    state.componentNode.rerender(env, attrs, visitor, state.shouldRerender);
    state.shouldRerender = false;
    return;
  }

  var read = env.hooks.getValue;
  var parentView = read(env.view);
  var found;

  if (attrs[componentClassSymbol] || attrs[componentLayoutSymbol]) {
    found = {
      component: read(attrs[componentClassSymbol]),
      layout: read(attrs[componentLayoutSymbol])
    };
  }

  var componentNode = state.componentNode =
    ComponentNode.create(renderNode, env, found, parentView, tagName,
                         scope, template);

  componentNode.render(env, attrs, visitor, parentView._state === 'inDOM');
}

