import { Option } from '@glimmer/interfaces';

import * as ASTv1 from '../v1/api';

export interface TraversalError extends Error {
  constructor: TraversalErrorConstructor;
  key: string;
  node: ASTv1.Node;
  parent: Option<ASTv1.Node>;
}

export interface TraversalErrorConstructor {
  new (message: string, node: ASTv1.Node, parent: Option<ASTv1.Node>, key: string): TraversalError;
  readonly prototype: TraversalError;
}

const TraversalError: TraversalErrorConstructor = (function () {
  TraversalError.prototype = Object.create(Error.prototype);
  TraversalError.prototype.constructor = TraversalError;

  function TraversalError(
    this: TraversalError,
    message: string,
    node: ASTv1.Node,
    parent: Option<ASTv1.Node>,
    key: string
  ) {
    let error = Error.call(this, message);

    this.key = key;
    this.message = message;
    this.node = node;
    this.parent = parent;
    this.stack = error.stack;
  }

  return (TraversalError as unknown) as TraversalErrorConstructor;
})();

export default TraversalError;

export function cannotRemoveNode(
  node: ASTv1.Node,
  parent: ASTv1.Node,
  key: string
): TraversalError {
  return new TraversalError(
    'Cannot remove a node unless it is part of an array',
    node,
    parent,
    key
  );
}

export function cannotReplaceNode(
  node: ASTv1.Node,
  parent: ASTv1.Node,
  key: string
): TraversalError {
  return new TraversalError(
    'Cannot replace a node with multiple nodes unless it is part of an array',
    node,
    parent,
    key
  );
}

export function cannotReplaceOrRemoveInKeyHandlerYet(
  node: ASTv1.Node,
  key: string
): TraversalError {
  return new TraversalError(
    'Replacing and removing in key handlers is not yet supported.',
    node,
    null,
    key
  );
}
