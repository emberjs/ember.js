import ComponentNodeManager from 'ember-htmlbars/node-managers/component-node-manager';
import buildComponentTemplate, { buildHTMLTemplate } from 'ember-views/system/build-component-template';

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

  let parentView = env.view;

  // | Top-level    | Invocation: <foo-bar>    | Invocation: {{foo-bar}}  |
  // ----------------------------------------------------------------------
  // | <div>        | <div> is component el    | no special semantics (a) |
  // | <foo-bar>    | <foo-bar> is identity el | EWTF                     |
  // | <bar-baz>    | recursive invocation     | no special semantics     |
  // | {{anything}} | EWTF                     | no special semantics     |
  //
  // (a) needs to be implemented specially, because the usual semantics of
  //     <div> are defined by the compiled template, and we need to emulate
  //     those semantics.

  let component = env.view;
  let isInvokedWithAngles = component && component._isAngleBracket;
  let isInvokedWithCurlies = component && !component._isAngleBracket;

  // <div> at the top level of a <foo-bar> invocation
  let isComponentHTMLElement = isAngleBracket && !isDasherized && isInvokedWithAngles;

  // <foo-bar> at the top level of a <foo-bar> invocation
  let isComponentIdentityElement = isAngleBracket && isTopLevel && tagName === env.view.tagName;

  // <div> at the top level of a {{foo-bar}} invocation
  let isNormalHTMLElement = isAngleBracket && !isDasherized && isInvokedWithCurlies;

  if (isComponentIdentityElement || isComponentHTMLElement) {
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
  } else if (isNormalHTMLElement) {
    let block = buildHTMLTemplate(tagName, attrs, { templates, scope });
    block(env, [], undefined, renderNode, scope, visitor);
  } else {
    // "No special semantics" aka we are invoking a component

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
