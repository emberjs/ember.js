import visitorKeys from '../types/visitor-keys';
import {
  cannotRemoveNode,
  cannotReplaceNode,
  cannotReplaceOrRemoveInKeyHandlerYet
} from './errors';

function visitNode(visitor, node) {
  let handler = visitor[node.type] || visitor.All;
  let result;

  if (handler && handler.enter) {
    result = handler.enter.call(null, node);
  }

  if (result === undefined) {
    let keys = visitorKeys[node.type];

    for (let i = 0; i < keys.length; i++) {
      visitKey(visitor, handler, node, keys[i]);
    }

    if (handler && handler.exit) {
      result = handler.exit.call(null, node);
    }
  }

  return result;
}

function visitKey(visitor, handler, node, key) {
  let value = node[key];
  if (!value) { return; }

  let keyHandler = handler && (handler.keys[key] || handler.keys.All);
  let result;

  if (keyHandler && keyHandler.enter) {
    result = keyHandler.enter.call(null, node, key);
    if (result !== undefined) {
      throw cannotReplaceOrRemoveInKeyHandlerYet(node, key);
    }
  }

  if (Array.isArray(value)) {
    visitArray(visitor, value);
  } else {
    let result = visitNode(visitor, value);
    if (result !== undefined) {
      assignKey(node, key, result);
    }
  }

  if (keyHandler && keyHandler.exit) {
    result = keyHandler.exit.call(null, node, key);
    if (result !== undefined) {
      throw cannotReplaceOrRemoveInKeyHandlerYet(node, key);
    }
  }
}

function visitArray(visitor, array) {
  for (let i = 0; i < array.length; i++) {
    let result = visitNode(visitor, array[i]);
    if (result !== undefined) {
      i += spliceArray(array, i, result) - 1;
    }
  }
}

function assignKey(node, key, result) {
  if (result === null) {
    throw cannotRemoveNode(node[key], node, key);
  } else if (Array.isArray(result)) {
    if (result.length === 1) {
      node[key] = result[0];
    } else {
      if (result.length === 0) {
        throw cannotRemoveNode(node[key], node, key);
      } else {
        throw cannotReplaceNode(node[key], node, key);
      }
    }
  } else {
    node[key] = result;
  }
}

function spliceArray(array, index, result) {
  if (result === null) {
    array.splice(index, 1);
    return 0;
  } else if (Array.isArray(result)) {
    array.splice(index, 1, ...result);
    return result.length;
  } else {
    array.splice(index, 1, result);
    return 1;
  }
}

export default function traverse(node, visitor) {
  visitNode(normalizeVisitor(visitor), node);
}

export function normalizeVisitor(visitor) {
  let normalizedVisitor = {};

  for (let type in visitor) {
    let handler = visitor[type] || visitor.All;
    let normalizedKeys = {};

    if (typeof handler === 'object') {
      let keys = handler.keys;
      if (keys) {
        for (let key in keys) {
          let keyHandler = keys[key];
          if (typeof keyHandler === 'object') {
            normalizedKeys[key] = {
              enter: (typeof keyHandler.enter === 'function') ? keyHandler.enter : null,
              exit: (typeof keyHandler.exit === 'function') ? keyHandler.exit : null
            };
          } else if (typeof keyHandler === 'function') {
            normalizedKeys[key] = {
              enter: keyHandler,
              exit: null
            };
          }
        }
      }

      normalizedVisitor[type] = {
        enter: (typeof handler.enter === 'function') ? handler.enter : null,
        exit: (typeof handler.exit === 'function') ? handler.exit : null,
        keys: normalizedKeys
      };
    } else if (typeof handler === 'function') {
      normalizedVisitor[type] = {
        enter: handler,
        exit: null,
        keys: normalizedKeys
      };
    }
  }

  return normalizedVisitor;
}
