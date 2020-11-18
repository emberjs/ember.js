import * as ASTv1 from '../v1/api';
import RootTransformScope, { TransformScope } from './scope';

export default class WalkerPath<N extends ASTv1.Node> {
  node: N;
  parent: WalkerPath<ASTv1.Node> | null;
  parentKey: string | null;
  scope: TransformScope;

  constructor(
    node: N,
    parent: WalkerPath<ASTv1.Node> | null = null,
    parentKey: string | null = null
  ) {
    this.node = node;
    this.parent = parent;
    this.parentKey = parentKey;
    this.scope = parent ? parent.scope.child(node) : new RootTransformScope(node);

    // Consume in scope values
    if (node.type === 'PathExpression') {
      this.scope.useLocal(node);
    }

    if (node.type === 'ElementNode') {
      this.scope.useLocal(node);

      (node as ASTv1.ElementNode).children.forEach((node: ASTv1.Statement) =>
        this.scope.useLocal(node)
      );
    }
  }

  get parentNode(): ASTv1.Node | null {
    return this.parent ? this.parent.node : null;
  }

  parents(): Iterable<WalkerPath<ASTv1.Node> | null> {
    return {
      [Symbol.iterator]: () => {
        return new PathParentsIterator(this);
      },
    };
  }
}

class PathParentsIterator implements Iterator<WalkerPath<ASTv1.Node> | null> {
  path: WalkerPath<ASTv1.Node>;

  constructor(path: WalkerPath<ASTv1.Node>) {
    this.path = path;
  }

  next() {
    if (this.path.parent) {
      this.path = this.path.parent;
      return { done: false, value: this.path };
    } else {
      return { done: true, value: null };
    }
  }
}
