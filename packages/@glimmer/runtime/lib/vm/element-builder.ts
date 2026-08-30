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
  SimpleElement,
  SimpleNode,
  SimpleText,
  TreeBuilder,
} from '@glimmer/interfaces';
import { expect } from '@glimmer/debug-util/lib/platform-utils';
import { setLocalDebugType } from '@glimmer/debug-util/lib/debug-brand';
import { destroy } from '@glimmer/destroyable';
import { DESTROYABLE_META_KEY } from '@glimmer/util/lib/destroyable-key';
import { LOCAL_DEBUG } from '@glimmer/local-debug-flags';
import { StackImpl as Stack } from '@glimmer/util/lib/collections';

import { clear, CursorImpl } from '../bounds';

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
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
    return this.cursors.current!.element;
  }

  get nextSibling(): Nullable<SimpleNode> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
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

  pushBlock<T extends AppendingBlock>(block: T, isRemote = false): T {
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

  /**
   * Rehydration and serialization override this. The default lives in
   * `./remote-element`, so a build without `{{#in-element}}` drops it.
   */
  __pushRemoteElement?(
    element: SimpleElement,
    guid: string,
    insertBefore: Maybe<SimpleNode>
  ): AppendingBlock;

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

  pushElement(element: SimpleElement, nextSibling: Maybe<SimpleNode> = null): void {
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

  __appendHTML(html: string): Bounds {
    return this.dom.insertHTMLBefore(this.element, this.nextSibling, html);
  }

  appendDynamicText(value: string): SimpleText {
    let node = this.untrustedContent(value);
    this.didAppendNode(node);
    return node;
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
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
    this.dom.setAttribute(this.constructing!, name, value, namespace);
  }

  __setProperty(name: string, value: unknown): void {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
    (this.constructing! as unknown as Element)[name as MutableKey<Element>] = value as never;
  }

  setStaticAttribute(name: string, value: string, namespace: Nullable<AttrNamespace>): void {
    this.__setAttribute(name, value, namespace);
  }
}

export class AppendingBlockImpl implements AppendingBlock {
  declare debug?: { first: () => Nullable<SimpleNode>; last: () => Nullable<SimpleNode> };

  [DESTROYABLE_META_KEY]: object | undefined;

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
export function clientBuilder(env: Environment, cursor: CursorImpl): TreeBuilder {
  return NewTreeBuilder.forInitialRender(env, cursor);
}

export type MutableKey<T> = {
  [P in keyof T]-?: (<U>() => U extends { [K in P]: T[P] } ? 1 : 2) extends <U>() => U extends {
    -readonly [K in P]: T[P];
  }
    ? 1
    : 2
    ? P
    : never;
}[keyof T];
