import visitorKeys from '../types/visitor-keys';
import {
  cannotRemoveNode,
  cannotReplaceNode,
  cannotReplaceOrRemoveInKeyHandlerYet
} from './errors';
import * as nodes from '../types/nodes';
import { Option } from "@glimmer/interfaces";

export interface NodeVisitor {
  All?: NodeHandler<nodes.BaseNode>;
  Program?: NodeHandler<nodes.Program>;
  MustacheStatement?: NodeHandler<nodes.MustacheStatement>;
  BlockStatement?: NodeHandler<nodes.BlockStatement>;
  ElementModifierStatement?: NodeHandler<nodes.ElementModifierStatement>;
  PartialStatement?: NodeHandler<nodes.PartialStatement>;
  CommentStatement?: NodeHandler<nodes.CommentStatement>;
  MustacheCommentStatement?: NodeHandler<nodes.MustacheCommentStatement>;
  ElementNode?: NodeHandler<nodes.ElementNode>;
  AttrNode?: NodeHandler<nodes.AttrNode>;
  TextNode?: NodeHandler<nodes.TextNode>;
  ConcatStatement?: NodeHandler<nodes.ConcatStatement>;
  SubExpression?: NodeHandler<nodes.SubExpression>;
  PathExpression?: NodeHandler<nodes.PathExpression>;
  StringLiteral?: NodeHandler<nodes.StringLiteral>;
  BooleanLiteral?: NodeHandler<nodes.BooleanLiteral>;
  NumberLiteral?: NodeHandler<nodes.NumberLiteral>;
  UndefinedLiteral?: NodeHandler<nodes.UndefinedLiteral>;
  NullLiteral?: NodeHandler<nodes.NullLiteral>;
  Hash?: NodeHandler<nodes.Hash>;
  HashPair?: NodeHandler<nodes.HashPair>;
}

export type NodeHandler<T> = NodeHandlerFunction<T> | EnterExitNodeHandler<T>;

export interface NodeHandlerFunction<T> {
  (node: T): any;
}

export interface EnterExitNodeHandler<T> {
  enter: NodeHandlerFunction<T>;
  exit: NodeHandlerFunction<T>;
  keys?: any;
}

function visitNode(visitor: NodeVisitor, node: nodes.Node): any {
  let handler: Option<NodeHandler<nodes.Node>> = visitor[node.type] || visitor.All || null;
  let result;

  if (handler && handler['enter']) {
    result = handler['enter'].call(null, node);
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
      visitKey(visitor, handler as any, node as any, keys[i]);
    }

    if (handler && handler['exit']) {
      result = handler['exit'].call(null, node);
    }
  }

  return result;
}

function visitKey(visitor: NodeVisitor, handler: EnterExitNodeHandler<nodes.Node>, node: nodes.Node & TraversedNode, key: string) {
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

function visitArray(visitor: NodeVisitor, array: nodes.Node[]) {
  for (let i = 0; i < array.length; i++) {
    let result = visitNode(visitor, array[i]);
    if (result !== undefined) {
      i += spliceArray(array, i, result) - 1;
    }
  }
}

export interface TraversedNode {
  [key: string]: nodes.Node;
}

function assignKey(node: TraversedNode & nodes.Node, key: string, result: nodes.Node) {
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

function spliceArray<T>(array: T[], index: number, result: T[]) {
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

export default function traverse(node: nodes.Node, visitor: NodeVisitor) {
  visitNode(normalizeVisitor(visitor), node);
}

export function normalizeVisitor(visitor: NodeVisitor) {
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
