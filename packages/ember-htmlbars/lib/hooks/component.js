import ComponentNodeManager from 'ember-htmlbars/node-managers/component-node-manager';

export default function componentHook(renderNode, env, scope, _tagName, params, attrs, templates, visitor) {
  var state = renderNode.state;

  // Determine if this is an initial render or a re-render
  if (state.manager) {
    state.manager.rerender(env, attrs, visitor);
    return;
  }

  let tagName = _tagName;
  let isAngleBracket = false;

  if (tagName.charAt(0) === '<') {
    tagName = tagName.slice(1, -1);
    isAngleBracket = true;
  }

  var parentView = env.view;

  var manager = ComponentNodeManager.create(renderNode, env, {
    tagName,
    params,
    attrs,
    parentView,
    templates,
    isAngleBracket,
    parentScope: scope
  });

  state.manager = manager;

  manager.render(env, visitor);
}
