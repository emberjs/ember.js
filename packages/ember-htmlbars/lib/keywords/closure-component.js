/**
@module ember
@submodule ember-templates
*/

import { assert } from 'ember-metal/debug';
import isEmpty from 'ember-metal/is_empty';
import isNone from 'ember-metal/is_none';
import symbol from 'ember-metal/symbol';
import BasicStream from '../streams/stream';
import EmptyObject from 'ember-metal/empty_object';
import { read } from '../streams/utils';
import { labelForSubexpr } from 'ember-htmlbars/hooks/subexpr';
import assign from 'ember-metal/assign';
import { isRestPositionalParams, processPositionalParams } from 'ember-htmlbars/utils/extract-positional-params';
import lookupComponent from 'ember-views/utils/lookup-component';

export const COMPONENT_REFERENCE = symbol('COMPONENT_REFERENCE');
export const COMPONENT_CELL = symbol('COMPONENT_CELL');
export const COMPONENT_PATH = symbol('COMPONENT_PATH');
export const COMPONENT_POSITIONAL_PARAMS = symbol('COMPONENT_POSITIONAL_PARAMS');
export const COMPONENT_HASH = symbol('COMPONENT_HASH');
export const COMPONENT_SOURCE = symbol('COMPONENT_SOURCE');

const ClosureComponentStream = BasicStream.extend({
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
  // the {{component helper will be forced to re-render the whole component
  // each time. Instead, these dependencies should not be required and the
  // element component keyword should add the params and hash as dependencies.
  params.forEach(item => s.addDependency(item));
  Object.keys(hash).forEach(key => s.addDependency(hash[key]));

  return s;
}

function createClosureComponentCell(env, originalComponentPath, params, hash, label) {
  let componentPath = read(originalComponentPath);

  assert(`Component path cannot be null in ${label}`,
         !isNone(componentPath));

  let newHash = assign(new EmptyObject(), hash);

  if (isComponentCell(componentPath)) {
    return createNestedClosureComponentCell(componentPath, params, newHash, env);
  } else {
    assert(`The component helper cannot be used without a valid component name. You used "${componentPath}" via ${label}`,
          isValidComponentPath(env, componentPath));
    return createNewClosureComponentCell(env, componentPath, params, newHash);
  }
}

function isValidComponentPath(env, path) {
  let result = lookupComponent(env.owner, path, { source: env.meta.moduleName && `template:${env.meta.moduleName}` });

  return !!(result.component || result.layout);
}

export function isComponentCell(component) {
  return component && component[COMPONENT_CELL];
}

function createNestedClosureComponentCell(componentCell, params, hash, env) {
  // This needs to be done in each nesting level to avoid raising assertions.
  processPositionalParamsFromCell(componentCell, params, hash);

  return {
    [COMPONENT_PATH]: componentCell[COMPONENT_PATH],
    [COMPONENT_SOURCE]: componentCell[COMPONENT_SOURCE],
    [COMPONENT_HASH]: mergeInNewHash(componentCell[COMPONENT_HASH],
                                     hash,
                                     env,
                                     componentCell[COMPONENT_POSITIONAL_PARAMS],
                                     params),
    [COMPONENT_POSITIONAL_PARAMS]: componentCell[COMPONENT_POSITIONAL_PARAMS],
    [COMPONENT_CELL]: true
  };
}

export function processPositionalParamsFromCell(componentCell, params, hash) {
  let positionalParams = componentCell[COMPONENT_POSITIONAL_PARAMS];

  processPositionalParams(null, positionalParams, params, hash);
}

function createNewClosureComponentCell(env, componentPath, params, hash) {
  let positionalParams = getPositionalParams(env.owner, componentPath);

  // This needs to be done in each nesting level to avoid raising assertions.
  processPositionalParams(null, positionalParams, params, hash);

  return {
    [COMPONENT_PATH]: componentPath,
    [COMPONENT_SOURCE]: env.meta.moduleName,
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

/*
 * This function merges two hashes in a new one.
 * Furthermore this function deals with the issue expressed in #13742.
 *
 * ```hbs
 * {{component (component 'link-to' 'index')}}
 * ```
 *
 * results in the following error
 *
 * > You must provide one or more parameters to the link-to component.
 *
 * This is so because a naive merging would not take into account that the
 * invocation (the external `{{component}}`) would result in the following
 * attributes (before merging with the ones in the contextual component):
 *
 * ```js
 * let attrs = { params: [] };
 * ```
 *
 * Given that the contextual component has the following attributes:
 *
 * ```js
 * let attrs = { params: ['index'] };
 * ```
 *
 * Merging them would result in:
 *
 * ```js
 * let attrs = { params: [] };
 * ```
 *
 * Therefore, if there are no positional parameters and `positionalParams` is
 * a string (rest positional parameters), we keep the parameters from the
 * `original` hash.
 *
 * Now we need to consider also the case where the positional params are being
 * passed as a named parameter.
 *
 */
export function mergeInNewHash(original, updates, env, positionalParams=[], params=[]) {
  let newHash = assign({}, original, updates);

  if (isRestPositionalParams(positionalParams) && isEmpty(params) && isEmpty(env.hooks.getValue(updates[positionalParams]))) {
    let propName = positionalParams;
    newHash[propName] = original[propName];
  }

  return newHash;
}
