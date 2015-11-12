import { Frame, Block, Scope } from './environment';
import { ElementStack } from './builder';
import { Enumerable } from './utils';
import DOMHelper from './dom';
import Template, { EvaluatedParams } from './template';
import { RenderResult } from './render';
import { VM } from './vm';
import { RootReference } from 'htmlbars-reference';

export interface MorphSpecializer<T extends Morph, InitOptions> {
  specialize(options: InitOptions): MorphConstructor<T, InitOptions>;
}

export interface MorphConstructor<T extends Morph, InitOptions> {
  new (parentNode: Element, frame: Frame): T & InitableMorph<InitOptions>;
}

interface InitableMorph<InitOptions> {
  init(options: InitOptions);
}

export interface MorphClass<M extends Morph> {
  new (parentNode: Element, frame: Frame): M;
  specialize<N extends M>(options: any): MorphClass<N>;
}

export interface HasParentNode {
  parentNode: Element;
}

export function createMorph<T extends Morph, InitOptions>(klass: MorphSpecializer<T, InitOptions>, parentElement: Element, frame: Frame, options: InitOptions): T {
  let Specialized = klass.specialize(options);
  let morph = new Specialized(parentElement, frame);
  morph.init(options);
  return morph;
}

export abstract class Morph implements HasParentNode {
  static specialize<T extends Morph, U>(options: U): MorphConstructor<T, U> {
    return <any>this;
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
  abstract append(stack: ElementStack, vm: VM<any>);

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
  static hasStaticElement = false;

  parentElement() {
    return this.parentNode;
  }

  createStack(nextSibling: Node) {
    let { parentNode, frame } = this;
    let dom = frame.dom();
    return new ElementStack({ parentNode, nextSibling, dom });
  }

  abstract firstNode(): Node;
  abstract lastNode(): Node;
}

export abstract class EmptyableMorph extends ContentMorph implements Bounds {
  private comment: boolean = false;
  private bounds: Bounds = null;
  public currentOperations: EmptyableMorphOperations = null;

  firstNode() {
    return this.currentOperations.firstNode();
  }

  lastNode() {
    return this.currentOperations.lastNode();
  }

  nextSibling() {
    return this.lastNode().nextSibling;
  }

  stackForContent(): ElementStack {
    let nextSibling = this.currentOperations.nextSiblingForContent();
    return this.createStack(nextSibling);
  }

  willAppend(stack: ElementStack) {
    this.currentOperations = new Appending(this, this.frame.dom(), stack);
  }

  didBecomeEmpty() {
    this.currentOperations.didBecomeEmpty();
  }

  nextSiblingForContent(): Node {
    return this.currentOperations.nextSiblingForContent();
  }

  didInsertContent(bounds: Bounds) {
    this.currentOperations.didInsertContent(bounds);
  }
}

abstract class EmptyableMorphOperations {
  protected parent: EmptyableMorph;
  protected dom: DOMHelper;

  constructor(parent: EmptyableMorph, dom: DOMHelper) {
    this.parent = parent;
    this.dom = dom;
  }

  abstract firstNode(): Node;
  abstract lastNode(): Node;
  abstract didBecomeEmpty();
  abstract nextSiblingForContent(): Node;
  abstract didInsertContent(bounds: Bounds);
}

class Appending extends EmptyableMorphOperations {
  private stack: ElementStack;

  firstNode() { return null; }
  lastNode() { return null; }

  constructor(parent: EmptyableMorph, dom: DOMHelper, stack: ElementStack) {
    super(parent, dom);
    this.stack = stack;
  }

  didBecomeEmpty() {
    let comment = this.stack.appendComment('');
    this.parent.currentOperations = new Empty(this.parent, this.dom, comment);
  }

  nextSiblingForContent() { return null; }

  didInsertContent(bounds: Bounds) {
    this.parent.currentOperations = new HasContent(this.parent, this.dom, bounds);
  }
}

class Empty extends EmptyableMorphOperations {
  private comment: Comment;

  constructor(parent: EmptyableMorph, dom: DOMHelper, comment: Comment) {
    super(parent, dom);
    this.comment = comment;
  }

  firstNode(): Node {
    return this.comment;
  }

  lastNode(): Node {
    return this.comment;
  }

  didBecomeEmpty() {}

  nextSiblingForContent(): Node {
    return this.comment;
  }

  didInsertContent(bounds: Bounds) {
    let { comment } = this;
    comment.parentNode.removeChild(comment);
    this.parent.currentOperations = new HasContent(this.parent, this.dom, bounds);
  }
}

class HasContent extends EmptyableMorphOperations {
  private bounds: Bounds;

  constructor(parent: EmptyableMorph, dom: DOMHelper, bounds: Bounds) {
    super(parent, dom);
    this.bounds = bounds;
  }

  firstNode(): Node {
    return this.bounds.firstNode();
  }

  lastNode(): Node {
    return this.bounds.lastNode();
  }

  didBecomeEmpty() {
    let dom = this.dom;
    let nextSibling = clear(this.bounds);

    let comment = dom.createComment('');
    dom.insertBefore(this.parent.parentNode, comment, nextSibling);

    this.parent.currentOperations = new Empty(this.parent, this.dom, comment);
  }

  nextSiblingForContent(): Node {
    return this.bounds.firstNode();
  }

  didInsertContent(bounds: Bounds) {
    if (this.bounds !== bounds) clear(this.bounds);
    this.bounds = bounds;
  }
}

export abstract class TemplateMorph extends EmptyableMorph {
  protected lastResult: RenderResult = null;
  protected template: Template = null;

  setRenderResult(result: RenderResult) {
    this.lastResult = result;
    this.template = result.template;
    this.didInsertContent(result);
  }

  firstNode(): Node {
    if (this.lastResult) return this.lastResult.firstNode();
    return super.firstNode();
  }

  lastNode(): Node {
    if (this.lastResult) return this.lastResult.lastNode();
    return super.lastNode();
  }

  protected setupScope(attrs: Object) {}

  protected updateScope(attrs: Object) {}

  appendTemplate(template: Template, vm: VM<any>, attrs: Object) {
    this.setupScope(attrs);

    if (!template || template.isEmpty) {
      this.didBecomeEmpty();
    } else {
      vm.pushScope(this.frame.scope());
      vm.invoke(template, this);
    }
  }

  append(stack: ElementStack, vm: VM<any>) {
    this.willAppend(stack);
    this.appendTemplate(this.template, vm, null);
  }

  updateTemplate(template: Template, attrs: Object) {
    let { lastResult, parentNode, frame } = this;

    this.updateScope(attrs);

    if (!lastResult || template !== lastResult.template) {
      this.replaceTemplate(template);
    } else {
      lastResult.rerender();
    }
  }

  replaceTemplate(template: Template) {
    let { lastResult, parentNode, frame } = this;

    let nextSibling = this.nextSiblingForContent();
    if (!template || template.isEmpty) {
      this.didBecomeEmpty();
    } else {
      let vm = frame.newVM(parentNode, nextSibling);
      this.setRenderResult(vm.execute(template));
    }
  }

  update() {
    this.updateTemplate(this.template, null);
  }

  didBecomeEmpty() {
    super.didBecomeEmpty();
    this.lastResult = null;
  }
}

export class SimpleTemplateMorph extends TemplateMorph {
  init({ template }: { template: Template }) {
    this.template = template;
  }
}

interface BlockOptions {
  block: Block;
  blockArguments?: EvaluatedParams;
}

export class BlockInvocationMorph extends TemplateMorph {
  static specialize(options: BlockOptions): typeof BlockInvocationMorph {
    if (options.blockArguments) return BlockWithParamsMorph;
    else return BlockInvocationMorph;
  }

  init({ block }: BlockOptions) {
    this.frame = block.frame;
    this.template = block.template;
  }
}

export class BlockWithParamsMorph extends BlockInvocationMorph {
  private blockArguments: EvaluatedParams;

  init({ block, blockArguments }: BlockOptions) {
    super.init({ block });
    this.blockArguments = blockArguments;
  }

  append(stack: ElementStack, vm: VM<any>) {
    this.frame.childScope(this.template.locals);
    this.frame.scope().bindLocalReferences(<RootReference[]>this.blockArguments.references);
    super.append(stack, vm);
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
