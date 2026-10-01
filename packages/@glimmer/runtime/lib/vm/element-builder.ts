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
  Shell,
  SimpleComment,
  SimpleDocumentFragment,
  SimpleElement,
  SimpleNode,
  SimpleText,
  TreeBuilder,
} from '@glimmer/interfaces';
import { expect } from '@glimmer/debug-util/lib/platform-utils';
import assert from '@glimmer/debug-util/lib/assert';
import { setLocalDebugType } from '@glimmer/debug-util/lib/debug-brand';
import { destroy, registerDestructor } from '@glimmer/destroyable';
import { DESTROYABLE_META_KEY } from '@glimmer/util/lib/destroyable-key';
import { LOCAL_DEBUG } from '@glimmer/local-debug-flags';
import { StackImpl as Stack } from '@glimmer/util/lib/collections';

import type { DynamicAttribute } from './attributes/dynamic';

import { clear, ConcreteBounds, CursorImpl } from '../bounds';
import { collectAnchors, ShellReplay } from '../dom/shells';
import { dynamicAttribute } from './attributes/dynamic';

export interface FirstNode {
  debug?: { first: () => Nullable<SimpleNode> };
  firstNode(): SimpleNode;
}

export interface LastNode {
  debug?: { last: () => Nullable<SimpleNode> };
  lastNode(): SimpleNode;
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

interface ClonedShell {
  // Holds the top-level nodes that are not in place yet.
  copy: SimpleDocumentFragment;
  anchors: SimpleNode[];
  // The cursor where the shell starts, for its top-level nodes and content.
  element: SimpleElement;
  nextSibling: Nullable<SimpleNode>;
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

  // Subclasses change how nodes are created, so only this class clones
  // shells. The others replay them node by node.
  readonly isPlain: boolean;
  private cloneShells: boolean;
  private shells: Array<ClonedShell | ShellReplay> = [];

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
    this.isPlain = Object.getPrototypeOf(this) === NewTreeBuilder.prototype;
    this.cloneShells = this.isPlain && this.dom.canCloneShells?.() === true;

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

  openShell(shell: Shell): void {
    if (!this.cloneShells || shell.live) {
      this.shells.push(new ShellReplay(shell));
      return;
    }

    let { element, nextSibling } = this;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- cloneShells checks it
    let copy = this.dom.cloneShell!(shell, element);

    this.shells.push({ copy, anchors: collectAnchors(copy, shell), element, nextSibling });
  }

  openShellElement(anchor: number): void {
    let current = this.currentShell();

    if (current instanceof ShellReplay) {
      current.openAnchor(this, anchor);
    } else {
      this.constructing = current.anchors[anchor] as SimpleElement;
    }
  }

  flushShellElement(modifiers: Nullable<ModifierInstance[]>): void {
    let current = this.currentShell();

    if (current instanceof ShellReplay) {
      current.flushAnchor(this, modifiers);
    } else {
      this.constructing = null;
      this.pushModifiers(modifiers);
    }
  }

  closeShellElement(anchor: number): Nullable<ModifierInstance[]> {
    let current = this.currentShell();

    if (current instanceof ShellReplay) {
      return current.closeAnchor(this, anchor);
    } else {
      return this.popModifiers();
    }
  }

  pushShellCursor(parent: number, next: number): void {
    let current = this.currentShell();

    if (current instanceof ShellReplay) {
      current.moveTo(this, parent, next);
      return;
    }

    let { anchors } = current;
    this.constructing = null;

    if (parent === -1) {
      // Content at the top level goes after the nodes before it, at the
      // shell's own cursor.
      this.insertShellNodes(current, next === -1 ? null : (anchors[next] as SimpleNode));
    } else {
      // The element joins the block's bounds with its top-level ancestor.
      this.block().nest();
      this.pushElement(anchors[parent] as SimpleElement, next === -1 ? null : anchors[next]);
    }
  }

  popShellCursor(parent: number): void {
    if (parent === -1 || this.currentShell() instanceof ShellReplay) return;

    this.popElement();
    this.block().closeElement();
  }

  closeShell(): void {
    let current = this.shells.pop() as ClonedShell | ShellReplay;

    if (current instanceof ShellReplay) {
      current.close(this);
    } else {
      this.constructing = null;
      this.insertShellNodes(current, null);
    }
  }

  // Moves the copy's top-level nodes before `stop` into place, so the page
  // and the block's bounds see nodes in document order.
  private insertShellNodes(shell: ClonedShell, stop: Nullable<SimpleNode>): void {
    let { copy, element, nextSibling } = shell;
    let first = copy.firstChild;

    if (first === null || first === stop) return;

    let last: SimpleNode;

    if (stop === null) {
      last = copy.lastChild as SimpleNode;
      this.dom.insertBefore(element, copy, nextSibling);
    } else {
      let node: SimpleNode = first;

      do {
        let next = node.nextSibling as SimpleNode;
        this.dom.insertBefore(element, node, nextSibling);
        last = node;
        node = next;
      } while (node !== stop);
    }

    this.didAppendNode(first);
    if (last !== first) this.didAppendNode(last);
  }

  private currentShell(): ClonedShell | ShellReplay {
    return this.shells[this.shells.length - 1] as ClonedShell | ShellReplay;
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
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
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

  setDynamicAttribute(
    name: string,
    value: unknown,
    trusting: boolean,
    namespace: Nullable<AttrNamespace>
  ): DynamicAttribute {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
    let element = this.constructing!;
    let attribute = dynamicAttribute(element, name, namespace, trusting);
    attribute.set(this, value, this.env);
    return attribute;
  }
}

export class AppendingBlockImpl implements AppendingBlock {
  declare debug?: { first: () => Nullable<SimpleNode>; last: () => Nullable<SimpleNode> };

  [DESTROYABLE_META_KEY]: object | undefined;

  // A node, or the bounds of a nested block. The flags tell which, so a
  // node needs no wrapper object.
  protected first: Nullable<SimpleNode | FirstNode> = null;
  protected last: Nullable<SimpleNode | LastNode> = null;
  protected firstIsNode = false;
  protected lastIsNode = false;
  protected nesting = 0;

  constructor(private parent: SimpleElement) {
    setLocalDebugType('block:simple', this);

    if (LOCAL_DEBUG) {
      this.debug = {
        first: () =>
          this.firstIsNode
            ? (this.first as SimpleNode)
            : ((this.first as Nullable<FirstNode>)?.debug?.first() ?? null),
        last: () =>
          this.lastIsNode
            ? (this.last as SimpleNode)
            : ((this.last as Nullable<LastNode>)?.debug?.last() ?? null),
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

    return this.firstIsNode ? (first as SimpleNode) : (first as FirstNode).firstNode();
  }

  lastNode(): SimpleNode {
    let last = expect(
      this.last,
      'cannot call `lastNode()` while `AppendingBlock` is still initializing'
    );

    return this.lastIsNode ? (last as SimpleNode) : (last as LastNode).lastNode();
  }

  openElement(element: SimpleElement) {
    this.didAppendNode(element);
    this.nesting++;
  }

  nest() {
    this.nesting++;
  }

  closeElement() {
    this.nesting--;
  }

  didAppendNode(node: SimpleNode) {
    if (this.nesting !== 0) return;

    if (this.first === null) {
      this.first = node;
      this.firstIsNode = true;
    }

    this.last = node;
    this.lastIsNode = true;
  }

  didAppendBounds(bounds: Bounds) {
    if (this.nesting !== 0) return;

    if (this.first === null) {
      this.first = bounds;
      this.firstIsNode = false;
    }

    this.last = bounds;
    this.lastIsNode = false;
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
    this.firstIsNode = false;
    this.lastIsNode = false;
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

  nest() {
    assert(false, 'Cannot open an element directly inside a block list');
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

export type MutableKey<T> = {
  [P in keyof T]-?: (<U>() => U extends { [K in P]: T[P] } ? 1 : 2) extends <U>() => U extends {
    -readonly [K in P]: T[P];
  }
    ? 1
    : 2
    ? P
    : never;
}[keyof T];
