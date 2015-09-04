/**
@module ember
@submodule ember-htmlbars
*/

import subscribe from 'ember-htmlbars/utils/subscribe';
import { isArray } from 'ember-runtime/utils';
import { chain, read, isStream, addDependency } from 'ember-metal/streams/utils';

export default function linkRenderNode(renderNode, env, scope, path, params, hash) {
  if (renderNode.streamUnsubscribers) {
    return true;
  }

  var keyword = env.hooks.keywords[path];
  if (keyword && keyword.link) {
    keyword.link(renderNode.getState(), params, hash);
  } else {
    switch (path) {
      case 'unbound': return true;
      case 'unless':
      case 'if': params[0] = shouldDisplay(params[0]); break;
      case 'each': params[0] = eachParam(params[0]); break;
    }
  }

  if (params && params.length) {
    for (var i = 0; i < params.length; i++) {
      subscribe(renderNode, env, scope, params[i]);
    }
  }

  if (hash) {
    for (var key in hash) {
      subscribe(renderNode, env, scope, hash[key]);
    }
  }

  // The params and hash can be reused; they don't need to be
  // recomputed on subsequent re-renders because they are
  // streams.
  return true;
}

function eachParam(list) {
  var listChange = getKey(list, '[]');

  var stream = chain(list, function() {
    read(listChange);
    return read(list);
  }, 'each');

  stream.addDependency(listChange);
  return stream;
}

function shouldDisplay(predicate) {
  var length = getKey(predicate, 'length');
  var isTruthy = getKey(predicate, 'isTruthy');

  var stream = chain(predicate, function() {
    var predicateVal = read(predicate);
    var lengthVal = read(length);
    var isTruthyVal = read(isTruthy);

    if (isArray(predicateVal)) {
      return lengthVal > 0;
    }

    if (typeof isTruthyVal === 'boolean') {
      return isTruthyVal;
    }

    return !!predicateVal;
  }, 'ShouldDisplay');

  addDependency(stream, length);
  addDependency(stream, isTruthy);

  return stream;
}

function getKey(obj, key) {
  if (isStream(obj)) {
    return obj.getKey(key);
  } else {
    return obj && obj[key];
  }
}
