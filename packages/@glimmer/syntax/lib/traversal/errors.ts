import * as AST from '../types/nodes';
import { Option } from '@glimmer/interfaces';

export interface TraversalError extends Error {
  constructor: TraversalErrorConstructor;
  key: string;
  node: AST.Node;
  parent: Option<AST.Node>;
}

export interface TraversalErrorConstructor {
  new (message: string, node: AST.Node, parent: Option<AST.Node>, key: string): TraversalError;
  readonly prototype: TraversalError;
}

const TraversalError: TraversalErrorConstructor = (function () {
  TraversalError.prototype = Object.create(Error.prototype);
  TraversalError.prototype.constructor = TraversalError;

  function TraversalError(this: TraversalError, message: string, node: AST.Node, parent: Option<AST.Node>, key: string) {
    let error = Error.call(this, message);

    this.key = key;
    this.message = message;
    this.node = node;
    this.parent = parent;
    this.stack = error.stack;
  }

  return TraversalError as any;
}());

export default TraversalError;

export function cannotRemoveNode(node: AST.Node, parent:AST.Node, key: string) {
  return new TraversalError(
    "Cannot remove a node unless it is part of an array",
    node, parent, key
  );
}

export function cannotReplaceNode(node: AST.Node, parent: AST.Node, key: string) {
  return new TraversalError(
    "Cannot replace a node with multiple nodes unless it is part of an array",
    node, parent, key
  );
}

export function cannotReplaceOrRemoveInKeyHandlerYet(node: AST.Node, key: string) {
  return new TraversalError(
    "Replacing and removing in key handlers is not yet supported.",
    node, null, key
  );
}
