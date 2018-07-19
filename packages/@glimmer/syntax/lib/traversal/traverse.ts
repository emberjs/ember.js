import visitorKeys from '../types/visitor-keys';
import {
  cannotRemoveNode,
  cannotReplaceNode,
  cannotReplaceOrRemoveInKeyHandlerYet,
} from './errors';
import { Node, NodeType, ParentNode, ChildKey } from '../types/nodes';
import { NodeVisitor, NodeFunction, NodeHandler, KeyFunction, KeyHandler } from '../types/visitor';

function getEnterFunction(handler: KeyHandler): KeyFunction | undefined;
function getEnterFunction(handler: NodeHandler): NodeFunction | undefined;
function getEnterFunction(
  handler: NodeHandler | KeyHandler
): NodeFunction | KeyFunction | undefined {
  return typeof handler === 'function' ? handler : handler.enter;
}

function getExitFunction(handler: KeyHandler): KeyFunction | undefined;
function getExitFunction(handler: NodeHandler): NodeFunction | undefined;
function getExitFunction(
  handler: NodeHandler | KeyHandler
): NodeFunction | KeyFunction | undefined {
  return typeof handler !== 'function' ? handler.exit : undefined;
}

function getKeyHandler(handler: NodeHandler, key: ChildKey): KeyHandler | undefined {
  let keyVisitor = typeof handler !== 'function' ? handler.keys : undefined;
  if (keyVisitor === undefined) return;
  let keyHandler = keyVisitor[key];
  if (keyHandler !== undefined) {
    // widen specific key to all keys
    return keyHandler as KeyHandler;
  }
  return keyVisitor.All;
}

function getNodeHandler(visitor: NodeVisitor, nodeType: NodeType): NodeHandler | undefined {
  let handler = visitor[nodeType];
  if (handler !== undefined) {
    // widen specific Node to all nodes
    return handler as NodeHandler;
  }
  return visitor.All;
}

function visitNode(visitor: NodeVisitor, node: Node): Node | Node[] | undefined | null | void {
  let handler = getNodeHandler(visitor, node.type);
  let enter: NodeFunction | undefined;
  let exit: NodeFunction | undefined;

  if (handler !== undefined) {
    enter = getEnterFunction(handler);
    exit = getExitFunction(handler);
  }

  let result: Node | Node[] | undefined | null | void;
  if (enter !== undefined) {
    result = enter(node);
  }

  if (result !== undefined && result !== null) {
    if (JSON.stringify(node) === JSON.stringify(result)) {
      result = undefined;
    } else if (Array.isArray(result)) {
      return visitArray(visitor, result) || result;
    } else {
      return visitNode(visitor, result) || result;
    }
  }

  if (result === undefined) {
    let keys = visitorKeys[node.type];

    for (let i = 0; i < keys.length; i++) {
      // we know if it has child keys we can widen to a ParentNode
      visitKey(visitor, handler, node as ParentNode, keys[i]);
    }

    if (exit !== undefined) {
      result = exit(node);
    }
  }

  return result;
}

function visitKey(
  visitor: NodeVisitor,
  handler: NodeHandler | undefined,
  node: ParentNode,
  key: ChildKey
) {
  let value = node[key] as Node | Node[] | null | undefined;
  if (!value) {
    return;
  }

  let keyEnter: KeyFunction | undefined;
  let keyExit: KeyFunction | undefined;

  if (handler !== undefined) {
    let keyHandler = getKeyHandler(handler, key);
    if (keyHandler !== undefined) {
      keyEnter = getEnterFunction(keyHandler);
      keyExit = getExitFunction(keyHandler);
    }
  }

  if (keyEnter !== undefined) {
    if (keyEnter(node, key) !== undefined) {
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

  if (keyExit !== undefined) {
    if (keyExit(node, key) !== undefined) {
      throw cannotReplaceOrRemoveInKeyHandlerYet(node, key);
    }
  }
}

function visitArray(visitor: NodeVisitor, array: Node[]) {
  for (let i = 0; i < array.length; i++) {
    let result = visitNode(visitor, array[i]);
    if (result !== undefined) {
      i += spliceArray(array, i, result) - 1;
    }
  }
}

function assignKey(node: Node, key: ChildKey, result: Node | Node[] | null) {
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

function spliceArray(array: Node[], index: number, result: Node | Node[] | null) {
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

export default function traverse(node: Node, visitor: NodeVisitor) {
  visitNode(visitor, node);
}
