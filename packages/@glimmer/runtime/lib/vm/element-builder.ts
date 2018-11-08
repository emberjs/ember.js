import { clear, Cursor, single, bounds } from '../bounds';

import { DOMChanges, DOMTreeConstruction } from '../dom/helper';

import {
  Option,
  Destroyable,
  Stack,
  LinkedList,
  LinkedListNode,
  assert,
  expect,
  DESTROY,
} from '@glimmer/util';

import { Environment } from '../environment';

import { VersionedReference } from '@glimmer/reference';

import { DynamicAttribute } from './attributes/dynamic';

import { Opaque, Simple, Bounds } from '@glimmer/interfaces';
import { associate } from '../lifetime';
import { destructor, DROP } from '../lifetime/destructor';
import { asyncReset } from '../lifetime/link';

export interface FirstNode {
  firstNode(): Option<Simple.Node>;
}

export interface LastNode {
  lastNode(): Option<Simple.Node>;
}

class First {
  constructor(private node: Simple.Node) {}

  firstNode(): Simple.Node {
    return this.node;
  }
}

class Last {
  constructor(private node: Simple.Node) {}

  lastNode(): Simple.Node {
    return this.node;
  }
}

export interface ElementOperations {
  setAttribute(
    name: string,
    value: VersionedReference<Opaque>,
    trusting: boolean,
    namespace: Option<string>
  ): void;
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
  pushRemoteElement(element: Simple.Element, guid: string, nextSibling: Option<Simple.Node>): void;
  popRemoteElement(): void;
  popElement(): void;
  openElement(tag: string, _operations?: ElementOperations): Simple.Element;
  flushElement(): void;
  appendText(string: string): Simple.Text;
  appendComment(string: string): Simple.Comment;

  appendDynamicHTML(value: string): void;
  appendDynamicText(value: string): Simple.Text;
  appendDynamicFragment(value: Simple.DocumentFragment): void;
  appendDynamicNode(value: Simple.Node): void;

  setStaticAttribute(name: string, value: string, namespace: Option<string>): void;
  setDynamicAttribute(
    name: string,
    value: Opaque,
    isTrusting: boolean,
    namespace: Option<string>
  ): DynamicAttribute;
  closeElement(): void;
}

export interface TreeOperations {
  __openElement(tag: string): Simple.Element;
  __flushElement(parent: Simple.Element, constructing: Simple.Element): void;
  __openBlock(): void;
  __closeBlock(): void;
  __appendText(text: string): Simple.Text;
  __appendComment(string: string): Simple.Comment;
  __appendNode(node: Simple.Node): Simple.Node;
  __appendHTML(html: string): Bounds;
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

  block(): LiveBlock;
  debugBlocks(): LiveBlock[];

  pushSimpleBlock(): LiveBlock;
  pushUpdatableBlock(): UpdatableBlock;
  pushBlockList(list: LinkedList<LinkedListNode & Bounds>): LiveBlock;
  popBlock(): LiveBlock;

  didAddDestroyable(d: Destroyable): void;
  didAppendBounds(bounds: Bounds): void;
}

export class NewElementBuilder implements ElementBuilder {
  public dom: DOMTreeConstruction;
  public updateOperations: DOMChanges;
  public constructing: Option<Simple.Element> = null;
  public operations: Option<ElementOperations> = null;
  public env: Environment;

  protected cursorStack = new Stack<Cursor>();
  private blockStack = new Stack<LiveBlock>();

  static forInitialRender(env: Environment, cursor: Cursor) {
    let builder = new this(env, cursor.element, cursor.nextSibling);
    builder.pushSimpleBlock();
    return builder;
  }

  static resume(env: Environment, tracker: LiveBlock, nextSibling: Option<Simple.Node>) {
    let parentNode = tracker.parentElement();

    let stack = new this(env, parentNode, nextSibling);
    stack.pushSimpleBlock();
    stack.pushBlockTracker(tracker);

    return stack;
  }

  constructor(env: Environment, parentNode: Simple.Element, nextSibling: Option<Simple.Node>) {
    this.pushElement(parentNode, nextSibling);

    this.env = env;
    this.dom = env.getAppendOperations();
    this.updateOperations = env.getDOM();
  }

  debugBlocks(): LiveBlock[] {
    return this.blockStack.toArray();
  }

  get element(): Simple.Element {
    return this.cursorStack.current!.element;
  }

  get nextSibling(): Option<Simple.Node> {
    return this.cursorStack.current!.nextSibling;
  }

  expectConstructing(method: string): Simple.Element {
    return expect(
      this.constructing,
      `${method} should only be called while constructing an element`
    );
  }

  block(): LiveBlock {
    return expect(this.blockStack.current, 'Expected a current block tracker');
  }

  popElement() {
    this.cursorStack.pop();
    expect(this.cursorStack.current, "can't pop past the last element");
  }

  pushSimpleBlock(): LiveBlock {
    return this.pushBlockTracker(new SimpleLiveBlock(this.element));
  }

  pushUpdatableBlock(): UpdatableBlock {
    return this.pushBlockTracker(new UpdatableLiveBlock(this.element));
  }

  pushBlockList(list: LinkedList<LinkedListNode & Bounds & Destroyable>): LiveBlock {
    return this.pushBlockTracker(new LiveBlockList(this.element, list));
  }

  protected pushBlockTracker<T extends LiveBlock>(tracker: T, isRemote = false): T {
    let current = this.blockStack.current;

    if (current !== null) {
      associate(current, tracker);

      if (!isRemote) {
        current.didAppendBounds(tracker);
      }
    }

    this.__openBlock();
    this.blockStack.push(tracker);
    return tracker;
  }

  popBlock(): LiveBlock {
    this.block().finalize(this);
    this.__closeBlock();
    return expect(this.blockStack.pop(), 'Expected popBlock to return a block');
  }

  __openBlock(): void {}
  __closeBlock(): void {}

  // todo return seems unused
  openElement(tag: string): Simple.Element {
    let element = this.__openElement(tag);
    this.constructing = element;

    return element;
  }

  __openElement(tag: string): Simple.Element {
    return this.dom.createElement(tag, this.element);
  }

  flushElement() {
    let parent = this.element;
    let element = expect(
      this.constructing,
      `flushElement should only be called when constructing an element`
    );

    this.__flushElement(parent, element);

    this.constructing = null;
    this.operations = null;

    this.pushElement(element, null);
    this.didOpenElement(element);
  }

  __flushElement(parent: Simple.Element, constructing: Simple.Element) {
    this.dom.insertBefore(parent, constructing, this.nextSibling);
  }

  closeElement() {
    this.willCloseElement();
    this.popElement();
  }

  pushRemoteElement(
    element: Simple.Element,
    guid: string,
    nextSibling: Option<Simple.Node> = null
  ) {
    this.__pushRemoteElement(element, guid, nextSibling);
  }

  __pushRemoteElement(element: Simple.Element, _guid: string, nextSibling: Option<Simple.Node>) {
    this.pushElement(element, nextSibling);
    let tracker = new RemoteLiveBlock(element);
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

  appendDynamicHTML(value: string): void {
    let bounds = this.trustedContent(value);
    this.didAppendBounds(bounds);
  }

  appendDynamicText(value: string): Simple.Text {
    let node = this.untrustedContent(value);
    this.didAppendNode(node);
    return node;
  }

  appendDynamicFragment(value: Simple.DocumentFragment): void {
    let bounds = this.__appendFragment(value);
    this.didAppendBounds(bounds);
  }

  appendDynamicNode(value: Simple.Node): void {
    let node = this.__appendNode(value);
    let bounds = single(this.element, node);
    this.didAppendBounds(bounds);
  }

  private trustedContent(value: string): Bounds {
    return this.__appendHTML(value);
  }

  private untrustedContent(value: string): Simple.Text {
    return this.__appendText(value);
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

  setDynamicAttribute(
    name: string,
    value: Opaque,
    trusting: boolean,
    namespace: Option<string>
  ): DynamicAttribute {
    let element = this.constructing!;
    let attribute = this.env.attributeFor(element, name, trusting, namespace);
    attribute.set(this, value, this.env);
    return attribute;
  }
}

export interface LiveBlock extends Bounds {
  openElement(element: Simple.Element): void;
  closeElement(): void;
  didAppendNode(node: Simple.Node): void;
  didAppendBounds(bounds: Bounds): void;
  newDestroyable(d: Destroyable): void;
  finalize(stack: ElementBuilder): void;
}

export class SimpleLiveBlock implements LiveBlock {
  protected first: Option<FirstNode> = null;
  protected last: Option<LastNode> = null;
  protected destroyables: Option<Destroyable[]> = null;
  protected nesting = 0;

  constructor(private parent: Simple.Element) {}

  parentElement() {
    return this.parent;
  }

  firstNode(): Option<Simple.Node> {
    return this.first && this.first.firstNode();
  }

  lastNode(): Option<Simple.Node> {
    return this.last && this.last.lastNode();
  }

  openElement(element: Simple.Element) {
    this.didAppendNode(element);
    this.nesting++;
  }

  closeElement() {
    this.nesting--;
  }

  didAppendNode(node: Simple.Node) {
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
    associate(this, d);
  }

  finalize(stack: ElementBuilder) {
    if (this.first === null) {
      stack.appendComment('');
    }
  }
}

export class RemoteLiveBlock extends SimpleLiveBlock {
  [DESTROY]() {
    clear(this);
  }
}

export interface UpdatableBlock extends LiveBlock {
  reset(env: Environment): Option<Simple.Node>;
}

export class UpdatableLiveBlock extends SimpleLiveBlock implements UpdatableBlock {
  reset(env: Environment): Option<Simple.Node> {
    asyncReset(this, env);

    let nextSibling = clear(this);

    this.first = null;
    this.last = null;
    this.destroyables = null;
    this.nesting = 0;

    return nextSibling;
  }
}

class LiveBlockList implements LiveBlock {
  constructor(
    private parent: Simple.Element,
    private boundList: LinkedList<LinkedListNode & Bounds & Destroyable>
  ) {
    this.parent = parent;
    this.boundList = boundList;
  }

  [DESTROY]() {
    this.boundList.forEachNode(d => destructor(d)[DROP]());
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

  openElement(_element: Simple.Element) {
    assert(false, 'Cannot openElement directly inside a block list');
  }

  closeElement() {
    assert(false, 'Cannot closeElement directly inside a block list');
  }

  didAppendNode(_node: Simple.Node) {
    assert(false, 'Cannot create a new node directly inside a block list');
  }

  didAppendBounds(_bounds: Bounds) {}

  newDestroyable(_d: Destroyable) {}

  finalize(_stack: ElementBuilder) {}
}

export function clientBuilder(env: Environment, cursor: Cursor): ElementBuilder {
  return NewElementBuilder.forInitialRender(env, cursor);
}
