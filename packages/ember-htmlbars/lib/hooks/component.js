import { assert } from 'ember-metal/debug';
import ComponentNodeManager from 'ember-htmlbars/node-managers/component-node-manager';
import buildComponentTemplate, { buildHTMLTemplate } from 'ember-views/system/build-component-template';
import lookupComponent from 'ember-htmlbars/utils/lookup-component';

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

  let currentComponent = env.view;
  let isInvokedWithAngles = currentComponent && currentComponent._isAngleBracket;
  let isInvokedWithCurlies = currentComponent && !currentComponent._isAngleBracket;

  // <div> at the top level of a <foo-bar> invocation
  let isComponentHTMLElement = isAngleBracket && !isDasherized && isInvokedWithAngles;

  // <foo-bar> at the top level of a <foo-bar> invocation
  let isComponentIdentityElement = isAngleBracket && isTopLevel && tagName === env.view.tagName;

  // <div> at the top level of a {{foo-bar}} invocation
  let isNormalHTMLElement = isAngleBracket && !isDasherized && isInvokedWithCurlies;

  let component, layout;
  if (isDasherized || !isAngleBracket) {
    let result = lookupComponent(env.container, tagName);
    component = result.component;
    layout = result.layout;

    if (isAngleBracket && isDasherized && !component && !layout) {
      isComponentHTMLElement = true;
    } else {
      assert(`HTMLBars error: Could not find component named "${tagName}" (no component or template with that name was found)`, !!(component || layout));
    }
  }

  if (isComponentIdentityElement || isComponentHTMLElement) {
    // Inside the layout for <foo-bar> invoked with angles, this is the top-level element
    // for the component. It can either be `<foo-bar>` (the "identity element") or any
    // normal HTML element (non-dasherized).
    let templateOptions = {
      component: currentComponent,
      tagName,
      isAngleBracket: true,
      isComponentElement: true,
      outerAttrs: scope.attrs,
      parentScope: scope
    };

    let contentOptions = { templates, scope };

    let { block } = buildComponentTemplate(templateOptions, attrs, contentOptions);
    block.invoke(env, [], undefined, renderNode, scope, visitor);
  } else if (isNormalHTMLElement) {
    let block = buildHTMLTemplate(tagName, attrs, { templates, scope });
    block.invoke(env, [], undefined, renderNode, scope, visitor);
  } else {
    // Invoking a component from the outside (either via <foo-bar> angle brackets
    // or {{foo-bar}} legacy curlies).

    var manager = ComponentNodeManager.create(renderNode, env, {
      tagName,
      params,
      attrs,
      parentView,
      templates,
      isAngleBracket,
      isTopLevel,
      component,
      layout,
      parentScope: scope
    });

    state.manager = manager;
    manager.render(env, visitor);
  }
}
