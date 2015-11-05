/**
@module ember
@submodule ember-templates
*/

import { assert } from 'ember-metal/debug';
import isNone from 'ember-metal/is_none';
import { symbol } from 'ember-metal/utils';
import BasicStream from 'ember-metal/streams/stream';
import { read } from 'ember-metal/streams/utils';
import { labelForSubexpr } from 'ember-htmlbars/hooks/subexpr';
import assign from 'ember-metal/assign';
import { processPositionalParams } from 'ember-htmlbars/utils/extract-positional-params';
import lookupComponent from 'ember-htmlbars/utils/lookup-component';

export const COMPONENT_REFERENCE = symbol('COMPONENT_REFERENCE');
export const COMPONENT_CELL = symbol('COMPONENT_CELL');
export const COMPONENT_PATH = symbol('COMPONENT_PATH');
export const COMPONENT_POSITIONAL_PARAMS = symbol('COMPONENT_POSITIONAL_PARAMS');
export const COMPONENT_HASH = symbol('COMPONENT_HASH');

let ClosureComponentStream = BasicStream.extend({
  init(env, path, params, hash) {
    this._env = env;
    this._path = path;
    this._params = params;
    this._hash = hash;
    this.label = labelForSubexpr([path, ...params], hash, 'component');
    this[COMPONENT_REFERENCE] = true;
  },
  compute() {
    return createClosureComponentCell(this._env, this._path, this._params, this._hash, this.label);
  }
});

export default function closureComponent(env, [path, ...params], hash) {
  let s = new ClosureComponentStream(env, path, params, hash);

  s.addDependency(path);

  // FIXME: If the stream invalidates on every params or hash change, then
  // the {{component helper will be forces to rerender the whole component
  // each time. Instead, these dependencies should not be required and the
  // element component keyword should add the params and hash as dependencies
  params.forEach(item => s.addDependency(item));
  Object.keys(hash).forEach(key => s.addDependency(hash[key]));

  return s;
}

function createClosureComponentCell(env, originalComponentPath, params, hash, label) {
  let componentPath = read(originalComponentPath);

  assert(`Component path cannot be null in ${label}`,
         !isNone(componentPath));

  if (isComponentCell(componentPath)) {
    return createNestedClosureComponentCell(componentPath, params, hash);
  } else {
    assert(`The component helper cannot be used without a valid component name. You used "${componentPath}" via ${label}`,
          isValidComponentPath(env, componentPath));
    return createNewClosureComponentCell(env, componentPath, params, hash);
  }
}

function isValidComponentPath(env, path) {
  let result = lookupComponent(env.owner, path);

  return !!(result.component || result.layout);
}

export function isComponentCell(component) {
  return component && component[COMPONENT_CELL];
}

function createNestedClosureComponentCell(componentCell, params, hash) {
  let positionalParams = componentCell[COMPONENT_POSITIONAL_PARAMS];

  // This needs to be done in each nesting level to avoid raising assertions
  processPositionalParams(null, positionalParams, params, hash);

  return {
    [COMPONENT_PATH]: componentCell[COMPONENT_PATH],
    [COMPONENT_HASH]: mergeInNewHash(componentCell[COMPONENT_HASH], hash),
    [COMPONENT_POSITIONAL_PARAMS]: positionalParams,
    [COMPONENT_CELL]: true
  };
}

function createNewClosureComponentCell(env, componentPath, params, hash) {
  let positionalParams = getPositionalParams(env.owner, componentPath);

  // This needs to be done in each nesting level to avoid raising assertions
  processPositionalParams(null, positionalParams, params, hash);

  return {
    [COMPONENT_PATH]: componentPath,
    [COMPONENT_HASH]: hash,
    [COMPONENT_POSITIONAL_PARAMS]: positionalParams,
    [COMPONENT_CELL]: true
  };
}

/*
 Returns the positional parameters for component `componentPath`.
 If it has no positional parameters, it returns the empty array.
 */
function getPositionalParams(container, componentPath) {
  if (!componentPath) { return []; }
  let result = lookupComponent(container, componentPath);
  let component = result.component;

  if (component && component.positionalParams) {
    return component.positionalParams;
  } else {
    return [];
  }
}

export function mergeInNewHash(original, updates) {
  return assign({}, original, updates);
}
