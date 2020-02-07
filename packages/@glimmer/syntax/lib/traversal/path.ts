import { Node } from '../types/nodes';

export default class Path<N extends Node> {
  node: N;
  parent: Path<Node> | null;
  parentKey: string | null;

  constructor(node: N, parent: Path<Node> | null = null, parentKey: string | null = null) {
    this.node = node;
    this.parent = parent;
    this.parentKey = parentKey;
  }

  get parentNode(): Node | null {
    return this.parent ? this.parent.node : null;
  }

  parents(): Iterable<Path<Node> | null> {
    return {
      [Symbol.iterator]: () => {
        return new PathParentsIterator(this);
      },
    };
  }
}

class PathParentsIterator implements Iterator<Path<Node> | null> {
  path: Path<Node>;

  constructor(path: Path<Node>) {
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
