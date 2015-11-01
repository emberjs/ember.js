import assign from 'ember-metal/assign';
import {
  COMPONENT_PATH,
  COMPONENT_POSITIONAL_PARAMS,
  COMPONENT_HASH,
  isComponentCell,
  mergeInNewHash,
} from  './closure-component';
import { processPositionalParams } from 'ember-htmlbars/utils/extract-positional-params';

export default {
  setupState(lastState, env, scope, params, hash) {
    let componentPath = getComponentPath(params[0], env);
    return assign({}, lastState, {
      componentPath,
      isComponentHelper: true
    });
  },

  render(morph, ...rest) {
    let state = morph.getState();

    if (state.manager) {
      state.manager.destroy();
    }

    // Force the component hook to treat this as a first-time render,
    // because normal components (`<foo-bar>`) cannot change at runtime,
    // but the `{{component}}` helper can.
    state.manager = null;

    render(morph, ...rest);
  },

  rerender: render
};

function getComponentPath(param, env) {
  let path = env.hooks.getValue(param);
  if (isComponentCell(path)) {
    path = path[COMPONENT_PATH];
  }
  return path;
}

function render(morph, env, scope, [path, ...params], hash, template, inverse, visitor) {
  let {
    componentPath
  } = morph.getState();

  // If the value passed to the {{component}} helper is undefined or null,
  // don't create a new ComponentNode.
  if (componentPath === undefined || componentPath === null) {
    return;
  }

  path = env.hooks.getValue(path);

  if (isComponentCell(path)) {
    let closureComponent = env.hooks.getValue(path);
    let positionalParams = closureComponent[COMPONENT_POSITIONAL_PARAMS];

    // This needs to be done in each nesting level to avoid raising assertions
    processPositionalParams(null, positionalParams, params, hash);
    params = [];
    hash = mergeInNewHash(closureComponent[COMPONENT_HASH], hash);
  }

  let templates = { default: template, inverse };
  env.hooks.component(
    morph, env, scope, componentPath,
    params, hash, templates, visitor
  );
}
