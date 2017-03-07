import * as AST from '../types/nodes';

class TraversalError extends Error {
  constructor(message: string, public node: AST.Node, public parent: Option<AST.Node>, public key: string) {
    super(message);
  }
}

TraversalError.prototype = Object.create(Error.prototype);
TraversalError.prototype.constructor = TraversalError;

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
