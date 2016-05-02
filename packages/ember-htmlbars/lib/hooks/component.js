import isEnabled from 'ember-metal/features';
import { assert } from 'ember-metal/debug';
import ComponentNodeManager from 'ember-htmlbars/node-managers/component-node-manager';
import buildComponentTemplate, { buildHTMLTemplate } from 'ember-views/system/build-component-template';
import lookupComponent from 'ember-htmlbars/utils/lookup-component';
import assign from 'ember-metal/assign';
import EmptyObject from 'ember-metal/empty_object';
import Cache from 'ember-metal/cache';
import {
  CONTAINS_DASH_CACHE,
  CONTAINS_DOT_CACHE
} from 'ember-htmlbars/system/lookup-helper';
import extractPositionalParams from 'ember-htmlbars/utils/extract-positional-params';
import {
  COMPONENT_PATH,
  COMPONENT_HASH,
  isComponentCell,
  mergeInNewHash,
  processPositionalParamsFromCell,
} from 'ember-htmlbars/keywords/closure-component';

var IS_ANGLE_CACHE = new Cache(1000, function(key) {
  return key.match(/^(@?)<(.*)>$/);
});

export default function componentHook(renderNode, env, scope, _tagName, params, attrs, templates, visitor) {
  var state = renderNode.getState();

  let tagName = _tagName;
  if (CONTAINS_DOT_CACHE.get(tagName)) {
    let stream = env.hooks.get(env, scope, tagName);
    let componentCell = stream.value();
    if (isComponentCell(componentCell)) {
      tagName = componentCell[COMPONENT_PATH];

      /*
       * Processing positional params before merging into a hash must be done
       * here to avoid problems with rest positional parameters rendered using
       * the dot notation.
       *
       * Closure components (for the contextual component feature) do not
       * actually keep the positional params, but process them at each level.
       * Therefore, when rendering a closure component with the component
       * helper we process the parameters and attributes and then merge those
       * on top of the closure component attributes.
       *
       */
      let newAttrs = assign(new EmptyObject(), attrs);
      processPositionalParamsFromCell(componentCell, params, newAttrs);
      params = [];
      attrs = mergeInNewHash(componentCell[COMPONENT_HASH], newAttrs);
    }
  }

  // Determine if this is an initial render or a re-render.
  if (state.manager) {
    let templateMeta = state.manager.block.template.meta;
    env.meta.moduleName = (templateMeta && templateMeta.moduleName) || (env.meta && env.meta.moduleName);
    extractPositionalParams(renderNode, state.manager.component.constructor, params, attrs, false);
    state.manager.rerender(env, attrs, visitor);
    return;
  }


  let isAngleBracket = false;
  let isTopLevel = false;
  let isDasherized = false;

  let angles = IS_ANGLE_CACHE.get(tagName);

  if (angles) {
    tagName = angles[2];
    isAngleBracket = true;
    isTopLevel = !!angles[1];
  }

  if (CONTAINS_DASH_CACHE.get(tagName)) {
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

  // <div> at the top level of a <foo-bar> invocation.
  let isComponentHTMLElement = isAngleBracket && !isDasherized && isInvokedWithAngles;

  // <foo-bar> at the top level of a <foo-bar> invocation.
  let isComponentIdentityElement = isAngleBracket && isTopLevel && tagName === env.view.tagName;

  // <div> at the top level of a {{foo-bar}} invocation.
  let isNormalHTMLElement = isAngleBracket && !isDasherized && isInvokedWithCurlies;

  let component, layout;
  if (isDasherized || !isAngleBracket) {
    let options = { };
    if (isEnabled('ember-htmlbars-local-lookup')) {
      let moduleName = env.meta && env.meta.moduleName;

      if (moduleName) {
        options.source = `template:${moduleName}`;
      }
    }

    let result = lookupComponent(env.owner, tagName, options);

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
      outerAttrs: scope.getAttrs(),
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
