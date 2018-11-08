import { Cursor, ConcreteBounds, SingleNodeBounds, clear } from '../bounds';

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
  associate,
  destructor,
  DROP,
  Destructor,
  associateDestructor,
} from '@glimmer/util';

import { Environment } from '../environment';

import { VersionedReference } from '@glimmer/reference';

import { DynamicAttribute } from './attributes/dynamic';

import { Opaque, Simple, Bounds } from '@glimmer/interfaces';
import { asyncReset } from '../lifetime';

export interface FirstNode {
  firstNode(): Simple.Node;
}

export interface LastNode {
  lastNode(): Simple.Node;
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

  firstNode(): Simple.Node {
    return this.bounds.firstNode();
  }

  lastNode(): Simple.Node {
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
  pushBlockList(list: LinkedList<LinkedListNode & Bounds>): LiveBlockList;
  popBlock(): LiveBlock;

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
    return new this(env, cursor.element, cursor.nextSibling).initialize();
  }

  static resume(env: Environment, block: UpdatableBlock) {
    let parentNode = block.parentElement();
    let nextSibling = block.reset(env);

    let stack = new this(env, parentNode, nextSibling).initialize();
    stack.pushLiveBlock(block);

    return stack;
  }

  constructor(env: Environment, parentNode: Simple.Element, nextSibling: Option<Simple.Node>) {
    this.pushElement(parentNode, nextSibling);

    this.env = env;
    this.dom = env.getAppendOperations();
    this.updateOperations = env.getDOM();
  }

  protected initialize(): this {
    this.pushSimpleBlock();
    return this;
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
    return expect(this.blockStack.current, 'Expected a current live block');
  }

  popElement() {
    this.cursorStack.pop();
    expect(this.cursorStack.current, "can't pop past the last element");
  }

  pushSimpleBlock(): LiveBlock {
    return this.pushLiveBlock(new SimpleLiveBlock(this.element));
  }

  pushUpdatableBlock(): UpdatableBlock {
    return this.pushLiveBlock(new UpdatableBlock(this.element));
  }

  pushBlockList(list: LinkedList<LinkedListNode & LiveBlock>): LiveBlockList {
    return this.pushLiveBlock(new LiveBlockList(this.element, list));
  }

  protected pushLiveBlock<T extends LiveBlock>(block: T, isRemote = false): T {
    let current = this.blockStack.current;

    if (current !== null) {
      associate(current, block);

      if (!isRemote) {
        current.didAppendBounds(block);
      }
    }

    this.__openBlock();
    this.blockStack.push(block);
    return block;
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
    let block = new RemoteLiveBlock(element);
    this.pushLiveBlock(block, true);
  }

  popRemoteElement() {
    this.popBlock();
    this.popElement();
  }

  protected pushElement(element: Simple.Element, nextSibling: Option<Simple.Node>) {
    this.cursorStack.push(new Cursor(element, nextSibling));
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
      let ret = new ConcreteBounds(this.element, first, fragment.lastChild!);
      this.dom.insertBefore(this.element, fragment, this.nextSibling);
      return ret;
    } else {
      return new SingleNodeBounds(this.element, this.__appendComment(''));
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
    let bounds = new SingleNodeBounds(this.element, node);
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
  finalize(stack: ElementBuilder): void;
  [DESTROY]?(): void;
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

  firstNode(): Simple.Node {
    let first = expect(
      this.first,
      'cannot call `firstNode()` while `SimpleLiveBlock` is still initializing'
    );

    return first.firstNode();
  }

  lastNode(): Simple.Node {
    let last = expect(
      this.last,
      'cannot call `lastNode()` while `SimpleLiveBlock` is still initializing'
    );

    return last.lastNode();
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

export class UpdatableBlock extends SimpleLiveBlock {
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

class ListContentsDestructor implements Destructor {
  constructor(private inner: LinkedList<LiveBlock & LinkedListNode>) {}

  [DROP]() {
    this.inner.forEachNode(d => destructor(d)[DROP]());
  }
}

// FIXME: All the noops in here indicate a modelling problem
class LiveBlockList implements LiveBlock {
  constructor(
    private readonly parent: Simple.Element,
    private readonly boundList: LinkedList<LinkedListNode & LiveBlock>
  ) {
    this.parent = parent;
    this.boundList = boundList;

    // The `boundList` is shared with the rest of the VM, and can be mutated
    // without our awareness. As a result, when the list is destroyed, figure
    // out the associated children on the fly and drop them.
    associateDestructor(this, new ListContentsDestructor(boundList));
  }

  parentElement() {
    return this.parent;
  }

  firstNode(): Simple.Node {
    let head = expect(
      this.boundList.head(),
      'cannot call `firstNode()` while `LiveBlockList` is still initializing'
    );

    return head.firstNode();
  }

  lastNode(): Simple.Node {
    let tail = expect(
      this.boundList.tail(),
      'cannot call `lastNode()` while `LiveBlockList` is still initializing'
    );

    return tail.lastNode();
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

  finalize(_stack: ElementBuilder) {
    assert(this.boundList.head() !== null, 'boundsList cannot be empty');
  }
}

export function clientBuilder(env: Environment, cursor: Cursor): ElementBuilder {
  return NewElementBuilder.forInitialRender(env, cursor);
}
