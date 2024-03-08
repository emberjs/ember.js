import type { Maybe, Nullable } from '../core.js';
import type { ElementOperations, Environment, ModifierInstance } from '../runtime.js';
import type { Stack } from '../stack.js';
import type { Bounds, Cursor } from './bounds.js';
import type { GlimmerTreeChanges, GlimmerTreeConstruction } from './changes.js';
import type {
  AttrNamespace,
  SimpleComment,
  SimpleDocumentFragment,
  SimpleElement,
  SimpleNode,
  SimpleText,
} from './simple.js';

export interface LiveBlock extends Bounds {
  openElement(element: SimpleElement): void;
  closeElement(): void;
  didAppendNode(node: SimpleNode): void;
  didAppendBounds(bounds: Bounds): void;
  finalize(stack: ElementBuilder): void;
}

export interface SimpleLiveBlock extends LiveBlock {
  parentElement(): SimpleElement;
  firstNode(): SimpleNode;
  lastNode(): SimpleNode;
}

export type RemoteLiveBlock = SimpleLiveBlock;

export interface UpdatableBlock extends SimpleLiveBlock {
  reset(env: Environment): Nullable<SimpleNode>;
}

export interface DOMStack {
  pushRemoteElement(
    element: SimpleElement,
    guid: string,
    insertBefore: Maybe<SimpleNode>
  ): RemoteLiveBlock;
  popRemoteElement(): RemoteLiveBlock;
  popElement(): void;
  openElement(tag: string, _operations?: ElementOperations): SimpleElement;
  flushElement(modifiers: Nullable<ModifierInstance[]>): void;
  appendText(string: string): SimpleText;
  appendComment(string: string): SimpleComment;

  appendDynamicHTML(value: string): void;
  appendDynamicText(value: string): SimpleText;
  appendDynamicFragment(value: SimpleDocumentFragment): void;
  appendDynamicNode(value: SimpleNode): void;

  setStaticAttribute(name: string, value: string, namespace: Nullable<string>): void;
  setDynamicAttribute(
    name: string,
    value: unknown,
    isTrusting: boolean,
    namespace: Nullable<string>
  ): AttributeOperation;

  closeElement(): Nullable<ModifierInstance[]>;
}

export interface TreeOperations {
  __openElement(tag: string): SimpleElement;
  __flushElement(parent: SimpleElement, constructing: SimpleElement): void;
  __openBlock(): void;
  __closeBlock(): void;
  __appendText(text: string): SimpleText;
  __appendComment(string: string): SimpleComment;
  __appendNode(node: SimpleNode): SimpleNode;
  __appendHTML(html: string): Bounds;
  __setAttribute(name: string, value: string, namespace: Nullable<string>): void;
  __setProperty(name: string, value: unknown): void;
}

declare const CURSOR_STACK: unique symbol;
export type CursorStackSymbol = typeof CURSOR_STACK;

export interface ElementBuilder extends Cursor, DOMStack, TreeOperations {
  [CURSOR_STACK]: Stack<Cursor>;

  nextSibling: Nullable<SimpleNode>;
  dom: GlimmerTreeConstruction;
  updateOperations: GlimmerTreeChanges;
  constructing: Nullable<SimpleElement>;
  element: SimpleElement;

  hasBlocks: boolean;
  debugBlocks(): LiveBlock[];

  pushSimpleBlock(): LiveBlock;
  pushUpdatableBlock(): UpdatableBlock;
  pushBlockList(list: Bounds[]): LiveBlock;
  popBlock(): LiveBlock;

  didAppendBounds(bounds: Bounds): void;
}

export interface AttributeCursor {
  element: SimpleElement;
  name: string;
  namespace: Nullable<AttrNamespace>;
}

export interface AttributeOperation {
  attribute: AttributeCursor;
  set(dom: ElementBuilder, value: unknown, env: Environment): void;
  update(value: unknown, env: Environment): void;
}
