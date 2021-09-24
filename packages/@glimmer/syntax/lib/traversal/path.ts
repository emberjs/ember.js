import * as ASTv1 from '../v1/api';

export default class WalkerPath<N extends ASTv1.Node> {
  node: N;
  parent: WalkerPath<ASTv1.Node> | null;
  parentKey: string | null;

  constructor(
    node: N,
    parent: WalkerPath<ASTv1.Node> | null = null,
    parentKey: string | null = null
  ) {
    this.node = node;
    this.parent = parent;
    this.parentKey = parentKey;
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
