import Bounds, { Cursor, DestroyableBounds, clear } from './bounds';

import { DOMChanges, DOMTreeConstruction } from './dom/helper';

import { Destroyable, Stack, LinkedList, LinkedListNode, assert } from 'glimmer-util';

import { Environment } from './environment';

import { VM } from './vm';

import {
  PathReference
} from 'glimmer-reference';

import {
  SimpleElementOperations,
  // ComponentElementOperations
} from './compiled/opcodes/dom';

import * as Simple from './dom/interfaces';

interface FirstNode {
  firstNode(): Simple.Node;
}

interface LastNode {
  lastNode(): Simple.Node;
}

class First {
  private node: Node;

  constructor(node) {
    this.node = node;
  }

  firstNode(): Node {
    return this.node;
  }
}

class Last {
  private node: Node;

  constructor(node) {
    this.node = node;
  }

  lastNode(): Node {
    return this.node;
  }
}

interface ElementStackOptions {
  parentNode: Element;
  nextSibling: Node;
  dom: DOMChanges;
}

interface ElementStackClass<T extends ElementStack> {
  new (options: ElementStackOptions): T;
}

class BlockStackElement {
  public firstNode: Node = null;
  public lastNode: Node = null;
}

export interface ElementOperations {
  addStaticAttribute(element: Simple.Element, name: string, value: string);
  addStaticAttributeNS(element: Simple.Element, namespace: string, name: string, value: string);
  addDynamicAttribute(element: Simple.Element, name: string, value: PathReference<string>, isTrusting: boolean);
  addDynamicAttributeNS(element: Simple.Element, namespace: string, name: string, value: PathReference<string>, isTrusting: boolean);
  flush(element: Simple.Element, vm: VM);
}

export class Fragment implements Bounds {
  private bounds: Bounds;

  constructor(bounds: Bounds) {
    this.bounds = bounds;
  }

  parentElement(): Simple.Element {
    return this.bounds.parentElement();
  }

  firstNode(): Simple.Node {
    return this.bounds.firstNode();
  }

  lastNode(): Simple.Node {
    return this.bounds.lastNode();
  }

  update(bounds: Bounds) {
    this.bounds = bounds;
  }
}

interface InitialRenderOptions {
  parentNode: Element;
  nextSibling: Node;
  dom: DOMChanges;
}

interface UpdateTrackerOptions {
  tracker: Tracker;
  nextSibling: Node;
  dom: DOMChanges;
}

export class ElementStack implements Cursor {
  public nextSibling: Simple.Node;
  public dom: DOMTreeConstruction;
  public updateOperations: DOMChanges;
  public constructing: Simple.Element = null;
  public operations: ElementOperations = null;
  public element: Simple.Element;
  public env: Environment;

  private elementStack = new Stack<Simple.Element>();
  private nextSiblingStack = new Stack<Simple.Node>();
  private blockStack = new Stack<Tracker>();

  private defaultOperations: ElementOperations;

  static forInitialRender(env: Environment, parentNode: Simple.Element, nextSibling: Simple.Node) {
    return new ElementStack(env, parentNode, nextSibling);
  }

  static resume(env: Environment, tracker: Tracker, nextSibling: Node) {
    let parentNode = tracker.parentElement();

    let stack = new ElementStack(env, parentNode, nextSibling);
    stack.pushBlockTracker(tracker);

    return stack;
  }

  constructor(env: Environment, parentNode: Simple.Element, nextSibling: Simple.Node) {
    this.env = env;
    this.dom = env.getAppendOperations();
    this.updateOperations = env.getDOM();
    this.element = parentNode;
    this.nextSibling = nextSibling;

    this.defaultOperations = new SimpleElementOperations(env);

    this.elementStack.push(this.element);
    this.nextSiblingStack.push(this.nextSibling);
  }

  block(): Tracker {
    return this.blockStack.current;
  }

  private popElement() {
    let { elementStack, nextSiblingStack }  = this;

    let topElement = elementStack.pop();
    nextSiblingStack.pop();

    this.element = elementStack.current;
    this.nextSibling = nextSiblingStack.current;

    return topElement;
  }

  pushSimpleBlock(): Tracker {
    let tracker = new SimpleBlockTracker(this.element);
    this.pushBlockTracker(tracker);
    return tracker;
  }

  pushUpdatableBlock(): UpdatableTracker {
    let tracker = new UpdatableBlockTracker(this.element);
    this.pushBlockTracker(tracker);
    return tracker;
  }

  private pushBlockTracker(tracker: Tracker) {
    let current = this.blockStack.current;

    if (current !== null) {
      current.newDestroyable(tracker);
      current.newBounds(tracker);
    }

    this.blockStack.push(tracker);
    return tracker;
  }

  pushBlockList(list: LinkedList<LinkedListNode & Bounds & Destroyable>): Tracker {
    let tracker = new BlockListTracker(this.element, list);
    let current = this.blockStack.current;

    if (current !== null) {
      current.newDestroyable(tracker);
      current.newBounds(tracker);
    }

    this.blockStack.push(tracker);
    return tracker;
  }

  popBlock(): Tracker {
    this.blockStack.current.finalize(this);

    return this.blockStack.pop();
  }

  openElement(tag: string, operations = this.defaultOperations): Simple.Element {
    let element = this.dom.createElement(tag, this.element);

    this.constructing = element;
    this.operations = operations;

    return element;
  }

  flushElement() {
    let parent  = this.element;
    let element = this.element = this.constructing;

    this.dom.insertBefore(parent, element, this.nextSibling);

    this.constructing = null;
    this.operations = null;
    this.nextSibling = null;
    this.elementStack.push(element);
    this.nextSiblingStack.push(null);
    this.blockStack.current.openElement(element);
  }

  newDestroyable(d: Destroyable) {
    this.blockStack.current.newDestroyable(d);
  }

  newBounds(bounds: Bounds) {
    this.blockStack.current.newBounds(bounds);
  }

  appendText(string: string): Simple.Text {
    let { dom } = this;
    let text = dom.createTextNode(string);
    dom.insertBefore(this.element, text, this.nextSibling);
    this.blockStack.current.newNode(text);
    return text;
  }

  appendComment(string: string): Simple.Comment {
    let { dom } = this;
    let comment = dom.createComment(string);
    dom.insertBefore(this.element, comment, this.nextSibling);
    this.blockStack.current.newNode(comment);
    return comment;
  }

  setStaticAttribute(name: string, value: string) {
    this.operations.addStaticAttribute(this.constructing, name, value);
  }

  setStaticAttributeNS(namespace: string, name: string, value: string) {
    this.operations.addStaticAttributeNS(this.constructing, namespace, name, value);
  }

  setDynamicAttribute(name: string, reference: PathReference<string>, isTrusting: boolean) {
    this.operations.addDynamicAttribute(this.constructing, name, reference, isTrusting);
  }

  setDynamicAttributeNS(namespace: string, name: string, reference: PathReference<string>, isTrusting: boolean) {
    this.operations.addDynamicAttributeNS(this.constructing, namespace, name, reference, isTrusting);
  }

  closeElement() {
    this.blockStack.current.closeElement();
    this.popElement();
  }
}

export interface Tracker extends DestroyableBounds {
  openElement(element: Simple.Element);
  closeElement();
  newNode(node: Simple.Node);
  newBounds(bounds: Bounds);
  newDestroyable(d: Destroyable);
  finalize(stack: ElementStack);
}

export class SimpleBlockTracker implements Tracker {
  protected first: FirstNode = null;
  protected last: LastNode = null;
  protected destroyables: Destroyable[] = null;
  protected nesting = 0;

  constructor(private parent: Simple.Element){
    this.parent = parent;
  }

  destroy() {
    let { destroyables } = this;

    if (destroyables && destroyables.length) {
      for (let i=0; i<destroyables.length; i++) {
        destroyables[i].destroy();
      }
    }
  }

  parentElement() {
    return this.parent;
  }

  firstNode() {
    return this.first && this.first.firstNode();
  }

  lastNode() {
    return this.last && this.last.lastNode();
  }

  openElement(element: Element) {
    this.newNode(element);
    this.nesting++;
  }

  closeElement() {
    this.nesting--;
  }

  newNode(node: Node) {
    if (this.nesting !== 0) return;

    if (!this.first) {
      this.first = new First(node);
    }

    this.last = new Last(node);
  }

  newBounds(bounds: Bounds) {
    if (this.nesting !== 0) return;

    if (!this.first) {
      this.first = bounds;
    }

    this.last = bounds;
  }

  newDestroyable(d: Destroyable) {
    this.destroyables = this.destroyables || [];
    this.destroyables.push(d);
  }

  finalize(stack: ElementStack) {
    if (!this.first) {
      stack.appendComment('');
    }
  }
}

export interface UpdatableTracker extends Tracker {
  reset(env: Environment);
}

export class UpdatableBlockTracker extends SimpleBlockTracker implements UpdatableTracker {
  reset(env: Environment) {
    let { destroyables } = this;

    if (destroyables && destroyables.length) {
      for (let i=0; i<destroyables.length; i++) {
        env.didDestroy(destroyables[i]);
      }
    }

    let nextSibling = clear(this);

    this.destroyables = null;
    this.first = null;
    this.last = null;

    return nextSibling;
  }
}

class BlockListTracker implements Tracker {
  constructor(private parent: Simple.Element, private boundList: LinkedList<LinkedListNode & Bounds & Destroyable>) {
    this.parent = parent;
    this.boundList = boundList;
  }

  destroy() {
    this.boundList.forEachNode(node => node.destroy());
  }

  parentElement() {
    return this.parent;
  }

  firstNode() {
    return this.boundList.head().firstNode();
  }

  lastNode() {
    return this.boundList.tail().lastNode();
  }

  openElement(element: Element) {
    assert(false, 'Cannot openElement directly inside a block list');
  }

  closeElement() {
    assert(false, 'Cannot closeElement directly inside a block list');
  }

  newNode(node: Node) {
    assert(false, 'Cannot create a new node directly inside a block list');
  }

  newBounds(bounds: Bounds) {
  }

  newDestroyable(d: Destroyable) {
  }

  finalize(stack: ElementStack) {
  }
}
