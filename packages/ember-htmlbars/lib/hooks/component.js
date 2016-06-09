import { assert } from 'ember-metal/debug';
import ComponentNodeManager from 'ember-htmlbars/node-managers/component-node-manager';
import lookupComponent from 'ember-views/utils/lookup-component';
import assign from 'ember-metal/assign';
import EmptyObject from 'ember-metal/empty_object';
import {
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
import { buildHTMLTemplate } from 'ember-htmlbars/system/build-component-template';

export default function componentHook(renderNode, env, scope, _tagName, params, _attrs, templates, visitor) {
  var state = renderNode.getState();

  let tagName = _tagName;
  let attrs = _attrs;
  if (isAngle(tagName)) {
    tagName = tagName.slice(1, -1);
    let block = buildHTMLTemplate(tagName, attrs, { templates, scope });
    block.invoke(env, [], undefined, renderNode, scope, visitor);
    return;
  }

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

  let parentView = env.view;
  let options = { };
  let moduleName = env.meta && env.meta.moduleName;
  if (moduleName) {
    options.source = `template:${moduleName}`;
  }
  let { component, layout } = lookupComponent(env.owner, tagName, options);

  assert(`HTMLBars error: Could not find component named "${tagName}" (no component or template with that name was found)`, !!(component || layout));

  let manager = ComponentNodeManager.create(renderNode, env, {
    tagName,
    params,
    attrs,
    parentView,
    templates,
    component,
    layout,
    parentScope: scope
  });

  state.manager = manager;
  manager.render(env, visitor);
}

function isAngle(tagName) {
  return tagName.charCodeAt(0) === 60;
}
