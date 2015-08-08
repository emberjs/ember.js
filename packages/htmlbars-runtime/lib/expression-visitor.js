/**
  # Expression Nodes:

  These nodes are not directly responsible for any part of the DOM, but are
  eventually passed to a Statement Node.

  * get
  * subexpr
  * concat
*/

export function acceptParams(nodes, env, scope) {
  let array = [];

  for (let i = 0, l = nodes.length; i < l; i++) {
    array.push(acceptExpression(nodes[i], env, scope).value);
  }

  return array;
}

export function acceptHash(pairs, env, scope) {
  let object = {};

  for (let i = 0, l = pairs.length; i < l; i += 2) {
    let key = pairs[i];
    let value = pairs[i+1];
    object[key] = acceptExpression(value, env, scope).value;
  }

  return object;
}

function acceptExpression(node, env, scope) {
  let ret = { value: null };

  // Primitive literals are unambiguously non-array representations of
  // themselves.
  if (typeof node !== 'object' || node === null) {
    ret.value = node;
  } else {
    ret.value = evaluateNode(node, env, scope);
  }

  return ret;
}

function evaluateNode(node, env, scope) {
  switch (node[0]) {
    // can be used by manualElement
    case 'value':   return node[1];
    case 'get':     return evaluateGet(node, env, scope);
    case 'subexpr': return evaluateSubexpr(node, env, scope);
    case 'concat':  return evaluateConcat(node, env, scope);
  }
}

function evaluateGet(node, env, scope) {
  let [, path] = node;

  return env.hooks.get(env, scope, path);
}

function evaluateSubexpr(node, env, scope) {
  let [, path, rawParams, rawHash] = node;

  let params = acceptParams(rawParams, env, scope);
  let hash = acceptHash(rawHash, env, scope);

  return env.hooks.subexpr(env, scope, path, params, hash);
}

function evaluateConcat(node, env, scope) {
  let [, rawParts] = node;

  let parts = acceptParams(rawParts, env, scope);

  return env.hooks.concat(env, parts);
}
