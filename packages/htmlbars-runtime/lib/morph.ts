import { Frame } from './environment';
import { ElementStack } from './builder';
import { Enumerable } from './utils';
import DOMHelper from './dom';
import Template from './template';

export interface MorphSpecializer<InitOptions> {
  specialize(options: InitOptions): MorphConstructor<InitOptions>;
}

export interface ContentMorphSpecializer<InitOptions> {
  specialize(options: InitOptions): ContentMorphConstructor<InitOptions>;
}

export interface MorphConstructor<InitOptions> extends MorphSpecializer<InitOptions> {
  new (parentNode: Element, frame: Frame): Morph<InitOptions>;
}

export interface ContentMorphConstructor<InitOptions> extends ContentMorphSpecializer<InitOptions> {
  new (parentNode: Element, frame: Frame): ContentMorph<InitOptions>;
}

// export interface MorphConstructor<T> {
//   specialize(...args: any[]): MorphConstructor<T>;
//   new (parentNode: Element, frame: Frame): T;
// }

export interface HasParentNode {
  parentNode: Element;
}

export abstract class Morph<InitOptions> implements HasParentNode {
  // static specialize(...args: any[]): MorphConstructor<Morph> { return <MorphConstructor<Morph>>this; }
  static specialize<InitOptions>(...args: any[]): MorphConstructor<InitOptions> { return <MorphConstructor<InitOptions>>this; }

  public parentNode: Element;
  public nextSibling: Node;
  public frame: Frame;

  constructor(parentNode: Element, frame: Frame) {
    this.frame = frame;

    // public, used by Builder
    this.parentNode = parentNode; // public, used by Builder
    this.nextSibling = null;
  }

  init(options: InitOptions) {}

  /**
    This method gets called during the initial render process. A morph should
    append its contents to the stack.
  */
  abstract append(stack: ElementStack);

  /**
    This method gets called during rerenders. A morph is responsible for
    detecting that no work needs to be done, or updating its bounds based
    on changes to input references.

    It is also responsible for managing its own bounds.
  */
  abstract update();

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
  destroy() {}
}

export abstract class ContentMorph<InitOptions> extends Morph<InitOptions> implements Bounds {
  static specialize<InitOptions>(...args: any[]): ContentMorphConstructor<InitOptions> {
    return <ContentMorphConstructor<InitOptions>>this;
  }

  parentElement() {
    return this.parentNode;
  }

  abstract firstNode(): Node;
  abstract lastNode(): Node;
}

export type MorphList = Enumerable<Morph<Object>>;

export interface Bounds {
  parentElement(): Element;
  firstNode(): Node;
  lastNode(): Node;
}

export function bounds(parent: Element, first: Node, last: Node): Bounds {
  return new ConcreteBounds(parent, first, last);
}

export class ConcreteBounds implements Bounds {
  public parentNode: Element;
  private first: Node;
  private last: Node;

  constructor(parent: Element, first: Node, last: Node) {
    this.parentNode = parent;
    this.first = first;
    this.last = last;
  }

  parentElement() { return this.parentNode; }
  firstNode() { return this.first; }
  lastNode() { return this.last; }
}

export function clearWithComment(bounds: Bounds, dom: DOMHelper) {
  let nextSibling = clear(bounds);
  let parent = bounds.parentElement();
  let comment = dom.createComment('');
  dom.insertBefore(bounds.parentElement(), comment, nextSibling);
  return new ConcreteBounds(parent, comment, comment);
}

export function renderIntoBounds(template: Template, bounds: Bounds, morph: HasParentNode, frame: Frame) {
  let nextSibling = clear(bounds);
  return template.evaluate(morph, frame);
}

export function clear(bounds: Bounds) {
  let parent = bounds.parentElement();
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