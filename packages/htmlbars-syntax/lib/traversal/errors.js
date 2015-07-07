function TraversalError(message, node, parent, key) {
  this.name = "TraversalError";
  this.message = message;
  this.node = node;
  this.parent = parent;
  this.key = key;
}

TraversalError.prototype = Object.create(Error.prototype);
TraversalError.prototype.constructor = TraversalError;

export default TraversalError;

export function cannotRemoveNode(node, parent, key) {
  return new TraversalError(
    "Cannot remove a node unless it is part of an array",
    node, parent, key
  );
}

export function cannotReplaceNode(node, parent, key) {
  return new TraversalError(
    "Cannot replace a node with multiple nodes unless it is part of an array",
    node, parent, key
  );
}
