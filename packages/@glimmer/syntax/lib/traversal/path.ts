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
}
