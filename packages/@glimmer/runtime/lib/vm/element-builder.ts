import { clear, Cursor, DestroyableBounds, single, Bounds, bounds } from '../bounds';

import { DOMChanges, DOMTreeConstruction } from '../dom/helper';
import { isString, isSafeString, isNode, isFragment, isEmpty } from '../dom/normalize';

import { Option, Destroyable, Stack, LinkedList, LinkedListNode, assert, expect } from '@glimmer/util';

import { Environment } from '../environment';

import { VersionedReference } from '@glimmer/reference';

import { DynamicContent, DynamicContentWrapper } from './content/dynamic';
import DynamicTextContent from './content/text';
import DynamicNodeContent from './content/node';
import DynamicHTMLContent, { DynamicTrustedHTMLContent } from './content/html';

import { DynamicAttribute } from './attributes/dynamic';

import { Opaque, Simple } from "@glimmer/interfaces";

export interface FirstNode {
  firstNode(): Option<Simple.Node>;
}

export interface LastNode {
  lastNode(): Option<Simple.Node>;
}

class First {
  constructor(private node: Node) { }

  firstNode(): Node {
    return this.node;
  }
}

class Last {
  constructor(private node: Node) { }

  lastNode(): Node {
    return this.node;
  }
}

export interface ElementOperations {
  setAttribute(name: string, value: VersionedReference<Opaque>, trusting: boolean, namespace: Option<string>): void;
}

export class Fragment implements Bounds {
  private bounds: Bounds;

  constructor(bounds: Bounds) {
    this.bounds = bounds;
  }

  parentElement(): Simple.Element {
    return this.bounds.parentElement();
  }

  firstNode(): Option<Simple.Node> {
    return this.bounds.firstNode();
  }

  lastNode(): Option<Simple.Node> {
    return this.bounds.lastNode();
  }
}

export interface DOMStack {
  pushRemoteElement(element: Simple.Element, nextSibling: Option<Simple.Node>): void;
  popRemoteElement(): void;
  popElement(): void;
  openElement(tag: string, _operations?: ElementOperations): Simple.Element;
  flushElement(): void;
  appendText(string: string): Simple.Text;
  appendComment(string: string): Simple.Comment;
  appendTrustingDynamicContent(reference: Opaque): DynamicContentWrapper;
  appendCautiousDynamicContent(reference: Opaque): DynamicContentWrapper;
  setStaticAttribute(name: string, value: string, namespace: Option<string>): void;
  setDynamicAttribute(name: string, value: Opaque, isTrusting: boolean, namespace: Option<string>): DynamicAttribute;
  closeElement(): void;
}

const ommittedTags = ['TBODY', 'TFOOT', 'THEAD', 'COLGROUP'];

export interface TreeOperations {
  __openElement(tag: string): Simple.Element;
  __flushElement(parent: Simple.Element, constructing: Simple.Element): void;
  __openBlock(): void;
  __closeBlock(): void;
  __appendText(text: string): Simple.Text;
  __appendComment(string: string): Simple.Comment;
  __appendNode(node: Simple.Node): Simple.Node;
  __appendHTML(html: string): Bounds;
  __appendTrustingDynamicContent(value: Opaque): DynamicContent;
  __appendCautiousDynamicContent(value: Opaque): DynamicContent;
  __setAttribute(name: string, value: string, namespace: Option<string>): void;
  __setProperty(name: string, value: Opaque): void;
}

export interface ElementBuilder extends Cursor, DOMStack, TreeOperations {
  nextSibling: Option<Simple.Node>;
  dom: DOMTreeConstruction;
  updateOperations: DOMChanges;
  constructing: Option<Simple.Element>;
  element: Simple.Element;
  env: Environment;

  // TODO: ?
  expectConstructing(method: string): Simple.Element;

  block(): Tracker;

  pushSimpleBlock(): Tracker;
  pushUpdatableBlock(): UpdatableTracker;
  pushBlockList(list: LinkedList<LinkedListNode & Bounds & Destroyable>): Tracker;
  popBlock(): Tracker;

  didAddDestroyable(d: Destroyable): void;
  didAppendBounds(bounds: Bounds): void;
}

export class NewElementBuilder implements ElementBuilder {
  public dom: DOMTreeConstruction;
  public updateOperations: DOMChanges;
  public constructing: Option<Simple.Element> = null;
  public operations: Option<ElementOperations> = null;
  public env: Environment;

  private cursorStack = new Stack<Cursor>();
  private blockStack = new Stack<Tracker>();

  static forInitialRender(env: Environment, cursor: Cursor) {
    let builder = new this(env, cursor.element, cursor.nextSibling);
    builder.pushSimpleBlock();
    return builder;
  }

  static resume(env: Environment, tracker: Tracker, nextSibling: Option<Simple.Node>) {
    let parentNode = tracker.parentElement();

    let stack = new this(env, parentNode, nextSibling);
    stack.pushSimpleBlock();
    stack.pushBlockTracker(tracker);

    return stack;
  }

  constructor(env: Environment, parentNode: Simple.Element, nextSibling: Option<Simple.Node>) {
    this.cursorStack.push(new Cursor(parentNode, nextSibling));

    this.env = env;
    this.dom = env.getAppendOperations();
    this.updateOperations = env.getDOM();
  }

  get element(): Simple.Element {
    return this.cursorStack.current!.element;
  }

  get nextSibling(): Option<Simple.Node> {
    return this.cursorStack.current!.nextSibling;
  }

  expectConstructing(method: string): Simple.Element {
    return expect(this.constructing, `${method} should only be called while constructing an element`);
  }

  block(): Tracker {
    return expect(this.blockStack.current, "Expected a current block tracker");
  }

  popElement() {
    this.cursorStack.pop();
    expect(this.cursorStack.current, "can't pop past the last element");
  }

  pushSimpleBlock(): Tracker {
    return this.pushBlockTracker(new SimpleBlockTracker(this.element));
  }

  pushUpdatableBlock(): UpdatableTracker {
    return this.pushBlockTracker(new UpdatableBlockTracker(this.element));
  }

  pushBlockList(list: LinkedList<LinkedListNode & Bounds & Destroyable>): Tracker {
    return this.pushBlockTracker(new BlockListTracker(this.element, list));
  }

  private pushBlockTracker<T extends Tracker>(tracker: T, isRemote = false): T {
    let current = this.blockStack.current;

    if (current !== null) {
      current.newDestroyable(tracker);

      if (!isRemote) {
        current.didAppendBounds(tracker);
      }
    }

    this.__openBlock();
    this.blockStack.push(tracker);
    return tracker;
  }

  popBlock(): Tracker {
    this.block().finalize(this);
    this.__closeBlock();
    return expect(this.blockStack.pop(), "Expected popBlock to return a block");
  }

  __openBlock(): void {}
  __closeBlock(): void {}

  openElement(tag: string): Simple.Element {
    let element = this.__openElement(tag);
    // let isTableElement = tag === 'td' || tag === 'tr' || tag === 'th';

    // if (isTableElement && this.element.tagName !== 'TBODY') {
    //   let tbody = this.dom.createElement('tbody');
    //   this.pushElement(tbody, null);
    // }

    if (tag === 'tbody' && this.element.tagName === 'TBODY') {
      this.popElement();
    }

    this.constructing = element;

    return element;
  }

  __openElement(tag: string): Simple.Element {
    return this.dom.createElement(tag, this.element);
  }

  flushElement() {
    let parent = this.element;
    let element = expect(this.constructing, `flushElement should only be called when constructing an element`);

    this.__flushElement(parent, element);

    this.constructing = null;
    this.operations = null;

    this.pushElement(element, null);
    this.didOpenElement(element);

    if (element.tagName === 'TABLE') {
      this.pushElement(this.dom.createElement('tbody'), null);
    }
  }

  __flushElement(parent: Simple.Element, constructing: Simple.Element) {
    this.dom.insertBefore(parent, constructing, this.nextSibling);
  }

  closeElement() {
    this.willCloseElement();

    if (this.element.tagName === 'TBODY' || this.element.tagName === 'COLGROUP') {
      let tbody = this.cursorStack.current!.element;
      this.popElement();
      this.__flushElement(this.element, tbody);
    } else {
      this.popElement();
    }

  }

  pushRemoteElement(element: Simple.Element, nextSibling: Option<Simple.Node> = null) {
    this.pushElement(element, nextSibling);

    let tracker = new RemoteBlockTracker(element);
    this.pushBlockTracker(tracker, true);
  }

  popRemoteElement() {
    this.popBlock();
    this.popElement();
  }

  protected pushElement(element: Simple.Element, nextSibling: Option<Simple.Node>) {
    this.cursorStack.push(new Cursor(element, nextSibling));
  }

  didAddDestroyable(d: Destroyable) {
    this.block().newDestroyable(d);
  }

  didAppendBounds(bounds: Bounds): Bounds {
    this.block().didAppendBounds(bounds);
    return bounds;
  }

  didAppendNode<T extends Simple.Node>(node: T): T {
    this.block().didAppendNode(node);
    return node;
  }

  didOpenElement(element: Simple.Element): Simple.Element {
    this.block().openElement(element);
    return element;
  }

  willCloseElement() {
    this.block().closeElement();
  }

  appendText(string: string): Simple.Text {
    return this.didAppendNode(this.__appendText(string));
  }

  __appendText(text: string): Simple.Text {
    let { dom, element, nextSibling } = this;
    let node = dom.createTextNode(text);
    dom.insertBefore(element, node, nextSibling);
    return node;
  }

  __appendNode(node: Simple.Node): Simple.Node {
    this.dom.insertBefore(this.element, node, this.nextSibling);
    return node;
  }

  __appendFragment(fragment: Simple.DocumentFragment): Bounds {
    let first = fragment.firstChild;

    if (first) {
      let ret = bounds(this.element, first, fragment.lastChild!);
      this.dom.insertBefore(this.element, fragment, this.nextSibling);
      return ret;
    } else {
      return single(this.element, this.__appendComment(''));
    }
  }

  __appendHTML(html: string): Bounds {
    return this.dom.insertHTMLBefore(this.element, this.nextSibling, html);
  }

  appendTrustingDynamicContent(value: Opaque): DynamicContentWrapper {
    let wrapper = new DynamicContentWrapper(this.__appendTrustingDynamicContent(value));
    this.didAppendBounds(wrapper);
    return wrapper;
  }

  __appendTrustingDynamicContent(value: Opaque): DynamicContent {
    if (isFragment(value)) {
      let bounds = this.__appendFragment(value);
      return new DynamicNodeContent(bounds, value, true);
    } else if (isNode(value)) {
      let node = this.__appendNode(value);
      return new DynamicNodeContent(single(this.element, node), node, true);
    } else {
      let normalized: string;

      if (isEmpty(value)) {
        normalized = '';
      } else if (isSafeString(value)) {
        normalized = value.toHTML();
      } else if (isString(value)) {
        normalized = value;
      } else {
        normalized = String(value);
      }

      let bounds = this.__appendHTML(normalized);
      return new DynamicTrustedHTMLContent(bounds, normalized, true);
    }
  }

  appendCautiousDynamicContent(value: Opaque): DynamicContentWrapper {
    let wrapper = new DynamicContentWrapper(this.__appendCautiousDynamicContent(value));
    this.didAppendBounds(wrapper.bounds);
    return wrapper;
  }

  __appendCautiousDynamicContent(value: Opaque): DynamicContent {
    if (isFragment(value)) {
      let bounds = this.__appendFragment(value);
      return new DynamicNodeContent(bounds, value, false);
    } else if (isNode(value)) {
      let node = this.__appendNode(value);
      return new DynamicNodeContent(single(this.element, node), node, false);
    } else if (isSafeString(value)) {
      let normalized = value.toHTML();
      let bounds = this.__appendHTML(normalized);
      // let bounds = this.dom.insertHTMLBefore(this.element, this.nextSibling, normalized);
      return new DynamicHTMLContent(bounds, value, false);
    } else {
      let normalized: string;

      if (isEmpty(value)) {
        normalized = '';
      } else if (isString(value)) {
        normalized = value;
      } else {
        normalized = String(value);
      }

      let textNode = this.__appendText(normalized);
      let bounds = single(this.element, textNode);

      return new DynamicTextContent(bounds, normalized, false);
    }
  }

  appendComment(string: string): Simple.Comment {
    return this.didAppendNode(this.__appendComment(string));
  }

  __appendComment(string: string): Simple.Comment {
    let { dom, element, nextSibling } = this;
    let node = dom.createComment(string);
    dom.insertBefore(element, node, nextSibling);
    return node;
  }

  __setAttribute(name: string, value: string, namespace: Option<string>): void {
    this.dom.setAttribute(this.constructing!, name, value, namespace);
  }

  __setProperty(name: string, value: Opaque): void {
    this.constructing![name] = value;
  }

  setStaticAttribute(name: string, value: string, namespace: Option<string>): void {
    this.__setAttribute(name, value, namespace);
  }

  setDynamicAttribute(name: string, value: Opaque, trusting: boolean, namespace: Option<string>): DynamicAttribute {
    let element = this.constructing!;
    let DynamicAttribute = this.env.attributeFor(element, name, trusting, namespace);
    let attribute = new DynamicAttribute({ element, name, namespace: namespace || null });

    attribute.set(this, value, this.env);

    return attribute;
  }
}

export interface Tracker extends DestroyableBounds {
  openElement(element: Simple.Element): void;
  closeElement(): void;
  didAppendNode(node: Simple.Node): void;
  didAppendBounds(bounds: Bounds): void;
  newDestroyable(d: Destroyable): void;
  finalize(stack: ElementBuilder): void;
}

export class SimpleBlockTracker implements Tracker {
  protected first: Option<FirstNode> = null;
  protected last: Option<LastNode> = null;
  protected destroyables: Option<Destroyable[]> = null;
  protected nesting = 0;

  constructor(private parent: Simple.Element){}

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

  firstNode(): Option<Simple.Node> {
    return this.first && this.first.firstNode();
  }

  lastNode(): Option<Simple.Node> {
    return this.last && this.last.lastNode();
  }

  openElement(element: Element) {
    this.didAppendNode(element);
    this.nesting++;
  }

  closeElement() {
    this.nesting--;
  }

  didAppendNode(node: Node) {
    if (this.nesting !== 0) return;

    if (!this.first) {
      this.first = new First(node);
    }

    this.last = new Last(node);
  }

  didAppendBounds(bounds: Bounds) {
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

  finalize(stack: ElementBuilder) {
    if (!this.first) {
      stack.appendComment('');
    }
  }
}

class RemoteBlockTracker extends SimpleBlockTracker {
  destroy() {
    super.destroy();

    clear(this);
  }
}

export interface UpdatableTracker extends Tracker {
  reset(env: Environment): Option<Simple.Node>;
}

export class UpdatableBlockTracker extends SimpleBlockTracker implements UpdatableTracker {
  reset(env: Environment): Option<Simple.Node> {
    let { destroyables } = this;

    if (destroyables && destroyables.length) {
      for (let i=0; i<destroyables.length; i++) {
        env.didDestroy(destroyables[i]);
      }
    }

    let nextSibling = clear(this);

    this.first = null;
    this.last = null;
    this.destroyables = null;
    this.nesting = 0;

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

  firstNode(): Option<Simple.Node> {
    let head = this.boundList.head();
    return head && head.firstNode();
  }

  lastNode(): Option<Simple.Node> {
    let tail = this.boundList.tail();
    return tail && tail.lastNode();
  }

  openElement(_element: Element) {
    assert(false, 'Cannot openElement directly inside a block list');
  }

  closeElement() {
    assert(false, 'Cannot closeElement directly inside a block list');
  }

  didAppendNode(_node: Node) {
    assert(false, 'Cannot create a new node directly inside a block list');
  }

  didAppendBounds(_bounds: Bounds) {
  }

  newDestroyable(_d: Destroyable) {
  }

  finalize(_stack: ElementBuilder) {
  }
}
