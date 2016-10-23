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
  COMPONENT_HASH,
  COMPONENT_PATH,
  COMPONENT_POSITIONAL_PARAMS,
  isComponentCell,
  mergeInNewHash,
  processPositionalParamsFromCell,
} from 'ember-htmlbars/keywords/closure-component';

export default function componentHook(renderNode, env, scope, _tagName, params, _attrs, templates, visitor) {
  let state = renderNode.getState();

  let tagName = _tagName;
  let attrs = _attrs;

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
      attrs = mergeInNewHash(componentCell[COMPONENT_HASH],
                             newAttrs,
                             env,
                             componentCell[COMPONENT_POSITIONAL_PARAMS],
                             params);
      params = [];
    }
  }

  // Determine if this is an initial render or a re-render.
  if (state.manager) {
    let sm = state.manager;
    extractPositionalParams(renderNode, sm.component.constructor, params, attrs, false);
    state.manager.rerender(env, attrs, visitor);
    return;
  }

  let parentView = env.view;

  let moduleName = env.meta && env.meta.moduleName;
  let options = { source: moduleName && `template:${moduleName}` };
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
