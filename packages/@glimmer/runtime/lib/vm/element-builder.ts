import type {
  AppendingBlock,
  AttrNamespace,
  Bounds,
  Cursor,
  ElementOperations,
  Environment,
  GlimmerTreeChanges,
  GlimmerTreeConstruction,
  Maybe,
  ModifierInstance,
  Nullable,
  ResettableBlock,
  SimpleComment,
  SimpleDocumentFragment,
  SimpleElement,
  SimpleNode,
  SimpleText,
  TreeBuilder,
} from '@glimmer/interfaces';
import { assert, expect, setLocalDebugType } from '@glimmer/debug-util';
import { destroy, registerDestructor } from '@glimmer/destroyable';
import { LOCAL_DEBUG } from '@glimmer/local-debug-flags';
import { Stack } from '@glimmer/util';

import type { DynamicAttribute } from './attributes/dynamic';

import { clear, ConcreteBounds, CursorImpl } from '../bounds';
import { dynamicAttribute } from './attributes/dynamic';

export interface FirstNode {
  debug?: { first: () => Nullable<SimpleNode> };
  firstNode(): SimpleNode;
}

export interface LastNode {
  debug?: { last: () => Nullable<SimpleNode> };
  lastNode(): SimpleNode;
}

class First {
  constructor(private node: SimpleNode) {}

  firstNode(): SimpleNode {
    return this.node;
  }
}

class Last {
  constructor(private node: SimpleNode) {}

  lastNode(): SimpleNode {
    return this.node;
  }
}

export class Fragment implements Bounds {
  private bounds: Bounds;

  constructor(bounds: Bounds) {
    this.bounds = bounds;
  }

  parentElement(): SimpleElement {
    return this.bounds.parentElement();
  }

  firstNode(): SimpleNode {
    return this.bounds.firstNode();
  }

  lastNode(): SimpleNode {
    return this.bounds.lastNode();
  }
}

export class NewTreeBuilder implements TreeBuilder {
  declare debug?: () => {
    blocks: AppendingBlock[];
    constructing: Nullable<SimpleElement>;
    cursors: Cursor[];
  };

  public dom: GlimmerTreeConstruction;
  public updateOperations: GlimmerTreeChanges;
  public constructing: Nullable<SimpleElement> = null;
  public operations: Nullable<ElementOperations> = null;
  private env: Environment;

  readonly cursors = new Stack<Cursor>();
  private modifierStack = new Stack<Nullable<ModifierInstance[]>>();
  private blockStack = new Stack<AppendingBlock>();

  static forInitialRender(env: Environment, cursor: CursorImpl) {
    return new this(env, cursor.element, cursor.nextSibling).initialize();
  }

  static resume(env: Environment, block: ResettableBlock): NewTreeBuilder {
    let parentNode = block.parentElement();
    let nextSibling = block.reset(env);

    let stack = new this(env, parentNode, nextSibling).initialize();
    stack.pushBlock(block);

    return stack;
  }

  constructor(env: Environment, parentNode: SimpleElement, nextSibling: Nullable<SimpleNode>) {
    this.pushElement(parentNode, nextSibling);
    this.env = env;
    this.dom = env.getAppendOperations();
    this.updateOperations = env.getDOM();

    if (LOCAL_DEBUG) {
      this.debug = () => ({
        blocks: this.blockStack.snapshot(),
        constructing: this.constructing,
        cursors: this.cursors.snapshot(),
      });
    }
  }

  protected initialize(): this {
    this.pushAppendingBlock();
    return this;
  }

  debugBlocks(): AppendingBlock[] {
    return this.blockStack.toArray();
  }

  get element(): SimpleElement {
    return this.cursors.current!.element;
  }

  get nextSibling(): Nullable<SimpleNode> {
    return this.cursors.current!.nextSibling;
  }

  get hasBlocks() {
    return this.blockStack.size > 0;
  }

  protected block(): AppendingBlock {
    return expect(this.blockStack.current, 'Expected a current live block');
  }

  popElement() {
    this.cursors.pop();
    expect(this.cursors.current, "can't pop past the last element");
  }

  pushAppendingBlock(): AppendingBlock {
    return this.pushBlock(new AppendingBlockImpl(this.element));
  }

  pushResettableBlock(): ResettableBlockImpl {
    return this.pushBlock(new ResettableBlockImpl(this.element));
  }

  pushBlockList(list: AppendingBlock[]): AppendingBlockList {
    return this.pushBlock(new AppendingBlockList(this.element, list));
  }

  protected pushBlock<T extends AppendingBlock>(block: T, isRemote = false): T {
    let current = this.blockStack.current;

    if (current !== null) {
      if (!isRemote) {
        current.didAppendBounds(block);
      }
    }

    this.__openBlock();
    this.blockStack.push(block);
    return block;
  }

  popBlock(): AppendingBlock {
    this.block().finalize(this);
    this.__closeBlock();
    return expect(this.blockStack.pop(), 'Expected popBlock to return a block');
  }

  __openBlock(): void {}
  __closeBlock(): void {}

  // todo return seems unused
  openElement(tag: string): SimpleElement {
    let element = this.__openElement(tag);
    this.constructing = element;

    return element;
  }

  __openElement(tag: string): SimpleElement {
    return this.dom.createElement(tag, this.element);
  }

  flushElement(modifiers: Nullable<ModifierInstance[]>) {
    let parent = this.element;
    let element = expect(
      this.constructing,
      `flushElement should only be called when constructing an element`
    );

    this.__flushElement(parent, element);

    this.constructing = null;
    this.operations = null;

    this.pushModifiers(modifiers);
    this.pushElement(element, null);
    this.didOpenElement(element);
  }

  __flushElement(parent: SimpleElement, constructing: SimpleElement) {
    this.dom.insertBefore(parent, constructing, this.nextSibling);
  }

  closeElement(): Nullable<ModifierInstance[]> {
    this.willCloseElement();
    this.popElement();
    return this.popModifiers();
  }

  pushRemoteElement(
    element: SimpleElement,
    guid: string,
    insertBefore: Maybe<SimpleNode>
  ): RemoteBlock {
    return this.__pushRemoteElement(element, guid, insertBefore);
  }

  __pushRemoteElement(
    element: SimpleElement,
    _guid: string,
    insertBefore: Maybe<SimpleNode>
  ): RemoteBlock {
    this.pushElement(element, insertBefore);

    if (insertBefore === undefined) {
      while (element.lastChild) {
        element.removeChild(element.lastChild);
      }
    }

    let block = new RemoteBlock(element);

    return this.pushBlock(block, true);
  }

  popRemoteElement(): RemoteBlock {
    const block = this.popBlock();
    assert(block instanceof RemoteBlock, '[BUG] expecting a RemoteBlock');
    this.popElement();
    return block;
  }

  protected pushElement(element: SimpleElement, nextSibling: Maybe<SimpleNode> = null): void {
    this.cursors.push(new CursorImpl(element, nextSibling));
  }

  private pushModifiers(modifiers: Nullable<ModifierInstance[]>): void {
    this.modifierStack.push(modifiers);
  }

  private popModifiers(): Nullable<ModifierInstance[]> {
    return this.modifierStack.pop();
  }

  didAppendBounds(bounds: Bounds): Bounds {
    this.block().didAppendBounds(bounds);
    return bounds;
  }

  didAppendNode<T extends SimpleNode>(node: T): T {
    this.block().didAppendNode(node);
    return node;
  }

  didOpenElement(element: SimpleElement): SimpleElement {
    this.block().openElement(element);
    return element;
  }

  willCloseElement(): void {
    this.block().closeElement();
  }

  appendText(string: string): SimpleText {
    return this.didAppendNode(this.__appendText(string));
  }

  __appendText(text: string): SimpleText {
    let { dom, element, nextSibling } = this;
    let node = dom.createTextNode(text);
    dom.insertBefore(element, node, nextSibling);
    return node;
  }

  __appendNode(node: SimpleNode): SimpleNode {
    this.dom.insertBefore(this.element, node, this.nextSibling);
    return node;
  }

  __appendFragment(fragment: SimpleDocumentFragment): Bounds {
    let first = fragment.firstChild;

    if (first) {
      let ret = new ConcreteBounds(this.element, first, fragment.lastChild!);
      this.dom.insertBefore(this.element, fragment, this.nextSibling);
      return ret;
    } else {
      const comment = this.__appendComment('');
      return new ConcreteBounds(this.element, comment, comment);
    }
  }

  __appendHTML(html: string): Bounds {
    return this.dom.insertHTMLBefore(this.element, this.nextSibling, html);
  }

  appendDynamicHTML(value: string): void {
    let bounds = this.trustedContent(value);
    this.didAppendBounds(bounds);
  }

  appendDynamicText(value: string): SimpleText {
    let node = this.untrustedContent(value);
    this.didAppendNode(node);
    return node;
  }

  appendDynamicFragment(value: SimpleDocumentFragment): void {
    let bounds = this.__appendFragment(value);
    this.didAppendBounds(bounds);
  }

  appendDynamicNode(value: SimpleNode): void {
    let node = this.__appendNode(value);
    let bounds = new ConcreteBounds(this.element, node, node);
    this.didAppendBounds(bounds);
  }

  private trustedContent(value: string): Bounds {
    return this.__appendHTML(value);
  }

  private untrustedContent(value: string): SimpleText {
    return this.__appendText(value);
  }

  appendComment(string: string): SimpleComment {
    return this.didAppendNode(this.__appendComment(string));
  }

  __appendComment(string: string): SimpleComment {
    let { dom, element, nextSibling } = this;
    let node = dom.createComment(string);
    dom.insertBefore(element, node, nextSibling);
    return node;
  }

  __setAttribute(name: string, value: string, namespace: Nullable<AttrNamespace>): void {
    this.dom.setAttribute(this.constructing!, name, value, namespace);
  }

  __setProperty(name: string, value: unknown): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.constructing! as any)[name] = value;
  }

  setStaticAttribute(name: string, value: string, namespace: Nullable<AttrNamespace>): void {
    this.__setAttribute(name, value, namespace);
  }

  setDynamicAttribute(
    name: string,
    value: unknown,
    trusting: boolean,
    namespace: Nullable<AttrNamespace>
  ): DynamicAttribute {
    let element = this.constructing!;
    let attribute = dynamicAttribute(element, name, namespace, trusting);
    attribute.set(this, value, this.env);
    return attribute;
  }
}

export class AppendingBlockImpl implements AppendingBlock {
  declare debug?: { first: () => Nullable<SimpleNode>; last: () => Nullable<SimpleNode> };

  protected first: Nullable<FirstNode> = null;
  protected last: Nullable<LastNode> = null;
  protected nesting = 0;

  constructor(private parent: SimpleElement) {
    setLocalDebugType('block:simple', this);

    if (LOCAL_DEBUG) {
      this.debug = {
        first: () => this.first?.debug?.first() ?? null,
        last: () => this.last?.debug?.last() ?? null,
      };
    }
  }

  parentElement() {
    return this.parent;
  }

  firstNode(): SimpleNode {
    let first = expect(
      this.first,
      'cannot call `firstNode()` while `AppendingBlock` is still initializing'
    );

    return first.firstNode();
  }

  lastNode(): SimpleNode {
    let last = expect(
      this.last,
      'cannot call `lastNode()` while `AppendingBlock` is still initializing'
    );

    return last.lastNode();
  }

  openElement(element: SimpleElement) {
    this.didAppendNode(element);
    this.nesting++;
  }

  closeElement() {
    this.nesting--;
  }

  didAppendNode(node: SimpleNode) {
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

  finalize(stack: TreeBuilder) {
    if (this.first === null) {
      stack.appendComment('');
    }
  }
}

export class RemoteBlock extends AppendingBlockImpl {
  constructor(parent: SimpleElement) {
    super(parent);

    setLocalDebugType('block:remote', this);

    registerDestructor(this, () => {
      // In general, you only need to clear the root of a hierarchy, and should never
      // need to clear any child nodes. This is an important constraint that gives us
      // a strong guarantee that clearing a subtree is a single DOM operation.
      //
      // Because remote blocks are not normally physically nested inside of the tree
      // that they are logically nested inside, we manually clear remote blocks when
      // a logical parent is cleared.
      //
      // HOWEVER, it is currently possible for a remote block to be physically nested
      // inside of the block it is logically contained inside of. This happens when
      // the remote block is appended to the end of the application's entire element.
      //
      // The problem with that scenario is that Glimmer believes that it owns more of
      // the DOM than it actually does. The code is attempting to write past the end
      // of the Glimmer-managed root, but Glimmer isn't aware of that.
      //
      // The correct solution to that problem is for Glimmer to be aware of the end
      // of the bounds that it owns, and once we make that change, this check could
      // be removed.
      //
      // For now, a more targeted fix is to check whether the node was already removed
      // and avoid clearing the node if it was. In most cases this shouldn't happen,
      // so this might hide bugs where the code clears nested nodes unnecessarily,
      // so we should eventually try to do the correct fix.
      if (this.parentElement() === this.firstNode().parentNode) {
        clear(this);
      }
    });
  }
}

export class ResettableBlockImpl extends AppendingBlockImpl implements ResettableBlock {
  constructor(parent: SimpleElement) {
    super(parent);
    setLocalDebugType('block:resettable', this);
  }

  reset(): Nullable<SimpleNode> {
    destroy(this);
    let nextSibling = clear(this);

    this.first = null;
    this.last = null;
    this.nesting = 0;

    return nextSibling;
  }
}

// FIXME: All the noops in here indicate a modelling problem
export class AppendingBlockList implements AppendingBlock {
  constructor(
    private readonly parent: SimpleElement,
    public boundList: AppendingBlock[]
  ) {
    this.parent = parent;
    this.boundList = boundList;
  }

  parentElement() {
    return this.parent;
  }

  firstNode(): SimpleNode {
    let head = expect(
      this.boundList[0],
      'cannot call `firstNode()` while `AppendingBlockList` is still initializing'
    );

    return head.firstNode();
  }

  lastNode(): SimpleNode {
    let boundList = this.boundList;

    let tail = expect(
      boundList[boundList.length - 1],
      'cannot call `lastNode()` while `AppendingBlockList` is still initializing'
    );

    return tail.lastNode();
  }

  openElement(_element: SimpleElement) {
    assert(false, 'Cannot openElement directly inside a block list');
  }

  closeElement() {
    assert(false, 'Cannot closeElement directly inside a block list');
  }

  didAppendNode(_node: SimpleNode) {
    assert(false, 'Cannot create a new node directly inside a block list');
  }

  didAppendBounds(_bounds: Bounds) {}

  finalize(_stack: TreeBuilder) {
    assert(this.boundList.length > 0, 'boundsList cannot be empty');
  }
}

export function clientBuilder(env: Environment, cursor: CursorImpl): TreeBuilder {
  return NewTreeBuilder.forInitialRender(env, cursor);
}
