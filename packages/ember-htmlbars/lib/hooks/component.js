import ComponentNodeManager from 'ember-htmlbars/node-managers/component-node-manager';
import buildComponentTemplate from 'ember-views/system/build-component-template';

export default function componentHook(renderNode, env, scope, _tagName, params, attrs, templates, visitor) {
  var state = renderNode.state;

  // Determine if this is an initial render or a re-render
  if (state.manager) {
    state.manager.rerender(env, attrs, visitor);
    return;
  }

  let tagName = _tagName;
  let isAngleBracket = false;
  let isTopLevel;

  let angles = tagName.match(/^(@?)<(.*)>$/);

  if (angles) {
    tagName = angles[2];
    isAngleBracket = true;
    isTopLevel = !!angles[1];
  }

  var parentView = env.view;

  if (!isTopLevel || tagName !== env.view.tagName) {
    var manager = ComponentNodeManager.create(renderNode, env, {
      tagName,
      params,
      attrs,
      parentView,
      templates,
      isAngleBracket,
      isTopLevel,
      parentScope: scope
    });

    state.manager = manager;
    manager.render(env, visitor);
  } else {
    let component = env.view;
    let templateOptions = {
      component,
      isAngleBracket: true,
      isComponentElement: true,
      outerAttrs: scope.attrs,
      parentScope: scope
    };

    let contentOptions = { templates, scope };

    let { block } = buildComponentTemplate(templateOptions, attrs, contentOptions);
    block.invoke(env, [], undefined, renderNode, scope, visitor);
  }
}
