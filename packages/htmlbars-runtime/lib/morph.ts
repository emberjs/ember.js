import { Frame } from './environment';
import { ElementStack } from './builder';
import { Enumerable } from './utils';
import DOMHelper from './dom';
import Template from './template';
import { RenderResult } from './render';

export interface MorphSpecializer<InitOptions> {
  specialize(options: InitOptions): MorphConstructor<InitOptions>;
}

export interface ContentMorphSpecializer<InitOptions> {
  specialize(options: InitOptions): ContentMorphConstructor<InitOptions>;
}

export interface MorphConstructor<InitOptions> extends MorphSpecializer<InitOptions> {
  new (parentNode: Element, frame: Frame): Morph;
}

export interface MorphClass<M extends Morph> {
  new (parentNode: Element, frame: Frame): M;
  specialize<N extends M>(options: any): MorphClass<N>;
}

export interface ContentMorphConstructor<InitOptions> extends ContentMorphSpecializer<InitOptions> {
  new (parentNode: Element, frame: Frame): ContentMorph;
}

export interface HasParentNode {
  parentNode: Element;
}

export interface InitableMorph<InitOptions> extends Morph {
  init(options: InitOptions);
}

export abstract class Morph implements HasParentNode {
  static specialize<InitOptions>(options: InitOptions): MorphConstructor<InitOptions> {
    return <MorphConstructor<InitOptions>>this;
  }

  public parentNode: Element;
  public frame: Frame;

  constructor(parentNode: Element, frame: Frame) {
    this.frame = frame;

    // public, used by Builder
    this.parentNode = parentNode; // public, used by Builder
  }

  parentElement() {
    return this.parentNode;
  }

  init(options: Object) {}

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

export abstract class ContentMorph extends Morph implements Bounds {
  static specialize<InitOptions>(options: InitOptions): ContentMorphConstructor<InitOptions> {
    return <ContentMorphConstructor<InitOptions>>this;
  }

  parentElement() {
    return this.parentNode;
  }

  abstract firstNode(): Node;
  abstract lastNode(): Node;
}

export abstract class EmptyableMorph extends ContentMorph implements Bounds {
  private comment: boolean = false;
  private bounds: Bounds = null;

  firstNode() {
    return this.bounds.firstNode();
  }

  lastNode() {
    return this.bounds.lastNode();
  }

  nextSibling() {
    return this.lastNode().nextSibling;
  }

  private _appendEmpty(nextSibling: Node) {
    this.comment = true;
    let dom = this.frame.dom();
    let comment = dom.createComment('');
    this.bounds = new SingleNodeBounds(this.parentNode, comment);
    dom.insertBefore(this.parentNode, comment, nextSibling);
  }

  appendEmpty(stack: ElementStack) {
    let comment = stack.appendComment('');
    this.bounds = new SingleNodeBounds(this.parentNode, comment);
  }

  protected isEmpty(): boolean {
    return !!this.comment;
  }

  empty() {
    if (this.comment) return;

    let nextSibling = clear(this);
    this._appendEmpty(nextSibling)
  }

  initializeBounds(bounds: Bounds) {
    this.bounds = bounds;
  }

  replaceWithBounds(bounds: Bounds) {
    let nextSibling = clear(this.bounds);
    this.bounds = bounds;
    this.comment = false;
  }
}

export abstract class TemplateMorph extends EmptyableMorph {
  protected lastResult: RenderResult;

  firstNode(): Node {
    if (this.lastResult) return this.lastResult.firstNode();
    return super.firstNode();
  }

  lastNode(): Node {
    if (this.lastResult) return this.lastResult.lastNode();
    return super.lastNode();
  }

  appendTemplate(template: Template, nextSibling: Node=null) {
    let result = this.lastResult = template.evaluate(this, nextSibling);
    this.initializeBounds(result);
  }

  updateTemplate(template: Template) {
    let { lastResult } = this;

    if (!lastResult) {
      let nextSibling = clear(this);
      this.appendTemplate(template, nextSibling);
      return;
    }

    if (template === lastResult.template) {
      lastResult.rerender();
      return lastResult;
    } else {
      let newResult = renderIntoBounds(template, lastResult, this);
      this.initializeBounds(newResult);
      return newResult;
    }
  }

  empty() {
    super.empty();
    this.lastResult = null;
  }
}

export interface Bounds {
  // a method to future-proof for wormholing; may not be needed ultimately
  parentElement(): Element;
  firstNode(): Node;
  lastNode(): Node;
}

export function bounds(parent: Element, first: Node, last: Node): Bounds {
  return new ConcreteBounds(parent, first, last);
}

export function appendBounds(parent: Element): Bounds {
  return new ConcreteBounds(parent, null, null);
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

export class SingleNodeBounds implements Bounds {
  private parentNode: Element;
  private node: Node;

  constructor(parentNode: Element, node: Node) {
    this.parentNode = parentNode;
    this.node = node;
  }

  parentElement() { return this.parentNode; }
  firstNode() { return this.node; }
  lastNode() { return this.node; }
}

export function initializeMorph<M extends Morph, InitOptions>(Type: MorphClass<M>, attrs: InitOptions, parentElement: Element, frame: Frame): M {
  let SpecializedType = Type.specialize(attrs);
  let morph = new SpecializedType(parentElement, frame);
  morph.init(attrs);
  return <M>morph;
}

export function clearWithComment(bounds: Bounds, dom: DOMHelper) {
  let nextSibling = clear(bounds);
  let parent = bounds.parentElement();
  let comment = dom.createComment('');
  dom.insertBefore(bounds.parentElement(), comment, nextSibling);
  return new ConcreteBounds(parent, comment, comment);
}

export function insertBoundsBefore(parent: Element, bounds: Bounds, reference: Bounds, dom: DOMHelper) {
  let first = bounds.firstNode();
  let last = bounds.lastNode();
  let nextSibling = reference ? reference.firstNode() : null;

  let current = first;

  while (current) {
    dom.insertBefore(parent, current, nextSibling);
    if (current === last) break;
    current = current.nextSibling;
  }
}

export function renderIntoBounds(template: Template, bounds: Bounds, morph: ContentMorph) {
  let nextSibling = clear(bounds);
  return template.evaluate(morph, nextSibling);
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