/**
@module ember
@submodule ember-htmlbars
*/

import subscribe from 'ember-htmlbars/utils/subscribe';
import { isArray } from 'ember-runtime/utils';
import { chain, read, isStream, addDependency } from '../streams/utils';
import { CONTAINS_DOT_CACHE } from 'ember-htmlbars/system/lookup-helper';
import {
  COMPONENT_HASH,
  isComponentCell,
  mergeInNewHash
} from 'ember-htmlbars/keywords/closure-component';

export default function linkRenderNode(renderNode, env, scope, path, params, hash) {
  if (renderNode.streamUnsubscribers) {
    return true;
  }

  let keyword = env.hooks.keywords[path];
  if (keyword && keyword.link) {
    keyword.link(renderNode.getState(), params, hash);
  } else if (path === 'unbound') {
    return true;
  } else {
    linkParamsFor(path, params);
  }

  // If there is a dot in the path, we need to subscribe to the arguments in the
  // closure component as well.

  if (CONTAINS_DOT_CACHE.get(path)) {
    let stream = env.hooks.get(env, scope, path);
    let componentCell = stream.value();

    if (isComponentCell(componentCell)) {
      let closureAttrs = mergeInNewHash(componentCell[COMPONENT_HASH], hash, env);

      for (let key in closureAttrs) {
        subscribe(renderNode, env, scope, closureAttrs[key]);
      }
    }
  }

  if (params && params.length) {
    for (let i = 0; i < params.length; i++) {
      subscribe(renderNode, env, scope, params[i]);
    }
  }

  if (hash) {
    for (let key in hash) {
      subscribe(renderNode, env, scope, hash[key]);
    }
  }

  // The params and hash can be reused. They don't need to be
  // recomputed on subsequent re-renders because they are
  // streams.
  return true;
}

export function linkParamsFor(path, params) {
  switch (path) {
  case 'unless':
  case 'if': params[0] = shouldDisplay(params[0], toBool); break;
  case 'each': params[0] = eachParam(params[0]); break;
  case 'with': params[0] = shouldDisplay(params[0], identity); break;
  }
}

function eachParam(list) {
  let listChange = getKey(list, '[]');

  let stream = chain(list, () => {
    read(listChange);
    return read(list);
  }, 'each');

  stream.addDependency(listChange);
  return stream;
}

function shouldDisplay(predicate, coercer) {
  let length = getKey(predicate, 'length');
  let isTruthy = getKey(predicate, 'isTruthy');

  let stream = chain(predicate, () => {
    let predicateVal = read(predicate);
    let lengthVal = read(length);
    let isTruthyVal = read(isTruthy);

    if (isArray(predicateVal)) {
      return lengthVal > 0 ? coercer(predicateVal) : false;
    }

    if (typeof isTruthyVal === 'boolean') {
      return isTruthyVal ? coercer(predicateVal) : false;
    }

    return coercer(predicateVal);
  }, 'ShouldDisplay');

  addDependency(stream, length);
  addDependency(stream, isTruthy);

  return stream;
}

function toBool(value) {
  return !!value;
}

function identity(value) {
  return value;
}

function getKey(obj, key) {
  if (isStream(obj)) {
    return obj.getKey(key);
  } else {
    return obj && obj[key];
  }
}
