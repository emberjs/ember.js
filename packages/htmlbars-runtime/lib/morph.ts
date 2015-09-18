import { Frame } from './hooks';
import { ElementStack } from './builder';
import { Enumerable } from './utils';

interface MorphClass {
  new (parentNode: Element, frame: Frame): Morph;
}

export class Morph {
  static specialize(): MorphClass { return this; }

  parentNode: Node;
  nextSibling: Node;
  frame: Frame;

  constructor(parentNode, frame) {
    this.frame = frame;

    // public, used by Builder
    this.parentNode = parentNode; // public, used by Builder
    this.nextSibling = null;
  }

  init(options: Object) {
    throw new Error(`Unimplemented init for ${this.constructor.name}`);
  }

  /**
    This method gets called during the initial render process. A morph should
    append its contents to the stack.
  */
  append(stack: ElementStack) {
    throw new Error(`Unimplemented append for ${this.constructor.name}`);
  }

  /**
    This method gets called during rerenders. A morph is responsible for
    detecting that no work needs to be done, or updating its bounds based
    on changes to input references.

    It is also responsible for managing its own bounds.
  */
  update() {
    throw new Error(`Unimplemented update for ${this.constructor.name}`);
  }

  /**
    This method gets called when a parent list is being cleared, which means
    that the area of DOM that this morph represents will not exist anymore.

    The morph should destroy its input reference (a forked reference or other
    composed reference).

    Normally, you don't need to manage DOM teardown here because the parent
    morph that contains this one will clear the DOM all at once. However,
    if the morph type supports being moved (a "wormhole"), then it will need
    to remember that it was moved and clear the DOM here.
  */
  destroy() {
    throw new Error(`Unimplemented destroy for ${this.constructor.name}`);
  }
}

export type MorphList = Enumerable<Morph>;

export interface Bounds {
  parentNode(): Node;
  firstNode(): Node;
  lastNode(): Node;
}

export function clear(bounds: Bounds) {
  let parent = bounds.parentNode();
  let first = bounds.firstNode();
  let last = bounds.lastNode();

  let node = first;

  while (node) {
    let next = node.nextSibling;
    parent.removeChild(node);
    if (node === last) return next;
    node = next;
  }

  return null;
}