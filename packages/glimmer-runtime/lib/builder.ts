import Bounds, { clear, Cursor } from './bounds';

import { DOMHelper } from './dom/helper';

import { Destroyable, InternedString, Stack, LinkedList, LinkedListNode, assert } from 'glimmer-util';

import { Environment } from './environment';

import {
  PathReference
} from 'glimmer-reference';

import {
  Attribute
} from './compiled/opcodes/dom';

interface FirstNode {
  firstNode(): Node;
}

interface LastNode {
  lastNode(): Node;
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
  dom: DOMHelper;
}

interface ElementStackClass<T extends ElementStack> {
  new (options: ElementStackOptions): T;
}

class BlockStackElement {
  public firstNode: Node = null;
  public lastNode: Node = null;
}

export interface ElementOperations {
  addAttribute(name: InternedString, value: PathReference<string>, isTrusting: boolean);
  addAttributeNS(namespace: InternedString, name: InternedString, value: PathReference<string>, isTrusting: boolean);
}

class GroupedElementOperations implements ElementOperations {
  public groups: Attribute[][];
  public group: Attribute[];

  private env: Environment;
  private element: Element;

  constructor(element: Element, env: Environment) {
    this.env = env;
    this.element = element;
    let group = this.group = [];
    this.groups = [group];
  }

  startGroup() {
    let group = this.group = [];
    this.groups.push(group);
  }

  addAttribute(name: InternedString, reference: PathReference<string>, isTrusting: boolean) {
    let attributeManager = this.env.attributeFor(this.element, name, reference, isTrusting);
    let attribute = new Attribute(this.element, attributeManager, name, reference);
    this.group.push(attribute);
  }

  addAttributeNS(namespace: InternedString, name: InternedString, reference: PathReference<string>, isTrusting: boolean) {
    let attributeManager = this.env.attributeFor(this.element, name, reference,isTrusting, namespace);
    let nsAttribute = new Attribute(this.element, attributeManager, name, reference, namespace);

    this.group.push(nsAttribute);
  }
}

export class Fragment implements Bounds {
  private bounds: Bounds;

  constructor(bounds: Bounds) {
    this.bounds = bounds;
  }

  parentElement(): Element {
    return this.bounds.parentElement();
  }

  firstNode(): Node {
    return this.bounds.firstNode();
  }

  lastNode(): Node {
    return this.bounds.lastNode();
  }

  update(bounds: Bounds) {
    this.bounds = bounds;
  }
}

interface InitialRenderOptions {
  parentNode: Element;
  nextSibling: Node;
  dom: DOMHelper;
}

interface UpdateTrackerOptions {
  tracker: Tracker;
  nextSibling: Node;
  dom: DOMHelper;
}

export class ElementStack implements Cursor {
  public nextSibling: Node;
  public dom: DOMHelper;
  public element: Element;
  public elementOperations: GroupedElementOperations = null;
  public env: Environment;

  private elementStack = new Stack<Element>();
  private nextSiblingStack = new Stack<Node>();
  private elementOperationsStack = new Stack<GroupedElementOperations>();
  private blockStack = new Stack<Tracker>();

  static forInitialRender(env: Environment, parentNode: Element, nextSibling: Node) {
    return new ElementStack(env, parentNode, nextSibling);
  }

  static resume(env: Environment, tracker: Tracker, nextSibling: Node) {
    let parentNode = tracker.parentElement();

    let stack = new ElementStack(env, parentNode, nextSibling);
    stack.pushBlockTracker(tracker);

    return stack;
  }

  constructor(env: Environment, parentNode: Element, nextSibling: Node) {
    this.env = env;
    this.dom = env.getDOM();
    this.element = parentNode;
    this.nextSibling = nextSibling;

    this.elementStack.push(this.element);
    this.nextSiblingStack.push(this.nextSibling);
  }

  block(): Tracker {
    return this.blockStack.current;
  }

  private pushElement(tag: InternedString): Element {
    let element = this.dom.createElement(tag, this.element);
    let elementOperations = new GroupedElementOperations(element, this.env);

    this.elementOperations = elementOperations;
    this.element = element;
    this.nextSibling = null;

    this.elementStack.push(element);
    this.elementOperationsStack.push(elementOperations);
    this.nextSiblingStack.push(null);

    return element;
  }

  private popElement() {
    let { elementStack, nextSiblingStack, elementOperationsStack }  = this;

    let topElement = elementStack.pop();
    nextSiblingStack.pop();
    elementOperationsStack.pop();

    this.element = elementStack.current;
    this.nextSibling = nextSiblingStack.current;
    this.elementOperations = elementOperationsStack.current;

    return topElement;
  }

  pushBlock(): Tracker {
    let tracker = new BlockTracker(this.element);
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

  openElement(tag: InternedString): Element {
    let element = this.pushElement(tag);
    this.blockStack.current.openElement(element);
    return element;
  }

  newDestroyable(d: Destroyable) {
    this.blockStack.current.newDestroyable(d);
  }

  newBounds(bounds: Bounds) {
    this.blockStack.current.newBounds(bounds);
  }

  appendText(string: string): Text {
    let { dom } = this;
    let text = dom.createTextNode(string);
    dom.insertBefore(this.element, text, this.nextSibling);
    this.blockStack.current.newNode(text);
    return text;
  }

  appendComment(string: string): Comment {
    let { dom } = this;
    let comment = dom.createComment(string);
    dom.insertBefore(this.element, comment, this.nextSibling);
    this.blockStack.current.newNode(comment);
    return comment;
  }

  setAttribute(name: InternedString, reference: PathReference<string>, isTrusting: boolean) {
    this.elementOperations.addAttribute(name, reference, isTrusting);
  }

  setAttributeNS(namespace: InternedString, name: InternedString, reference: PathReference<string>, isTrusting: boolean) {
    this.elementOperations.addAttributeNS(namespace, name, reference, isTrusting);
  }

  closeElement() {
    this.blockStack.current.closeElement();
    let child = this.popElement();
    this.dom.insertBefore(this.element, child, this.nextSibling);
  }
}

export interface Tracker extends Bounds, Destroyable {
  openElement(element: Element);
  closeElement();
  newNode(node: Node);
  newBounds(bounds: Bounds);
  newDestroyable(d: Destroyable);
  finalize(stack: ElementStack);
  reset(env: Environment);
}

class BlockTracker implements Tracker {
  private first: FirstNode = null;
  private last: LastNode = null;
  private destroyables: Destroyable[] = null;
  private nesting = 0;

  private parent: Element;

  constructor(parent: Element){
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
  private parent: Element;
  private boundList: LinkedList<LinkedListNode & Bounds & Destroyable>;

  constructor(parent: Element, boundList: LinkedList<LinkedListNode & Bounds & Destroyable>) {
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

  reset() {}
}
