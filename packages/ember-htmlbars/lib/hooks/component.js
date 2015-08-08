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
  let isTopLevel = false;
  let isDasherized = false;

  let angles = tagName.match(/^(@?)<(.*)>$/);

  if (angles) {
    tagName = angles[2];
    isAngleBracket = true;
    isTopLevel = !!angles[1];
  }

  if (tagName.indexOf('-') !== -1) {
    isDasherized = true;
  }

  var parentView = env.view;

  if (isTopLevel && tagName === env.view.tagName || !isDasherized) {
    let component = env.view;
    let templateOptions = {
      component,
      tagName,
      isAngleBracket: true,
      isComponentElement: true,
      outerAttrs: scope.attrs,
      parentScope: scope
    };

    let contentOptions = { templates, scope };

    let { block } = buildComponentTemplate(templateOptions, attrs, contentOptions);
    block(env, [], undefined, renderNode, scope, visitor);
  } else {
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
  }
}
