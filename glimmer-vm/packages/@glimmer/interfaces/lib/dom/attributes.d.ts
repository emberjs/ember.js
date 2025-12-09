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

/**
 * `AppendingBlock` is the interface used by the `ElementBuilder` to keep track of which nodes have
 * been appended to a block. Ultimately, an `AppendingBlock` is finalized and used as a `FixedBlock`
 * or `ResettableBlock` during the updating phase.
 */
export interface AppendingBlock extends Bounds {
  debug?: { first: () => Nullable<SimpleNode>; last: () => Nullable<SimpleNode> };

  openElement(element: SimpleElement): void;
  closeElement(): void;
  didAppendNode(node: SimpleNode): void;
  didAppendBounds(bounds: Bounds): void;
  finalize(stack: TreeBuilder): void;
}

/**
 * A `FixedBlock` is a block that is only rendered once, during initial render. Its *children* may
 * change during the updating phase, and this may cause its *bounds* to change, but the block itself
 * remains stable.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- @fixme
export interface FixedBlock extends AppendingBlock {}

/**
 * A `ResettableBlock` can be reset during the updating phase and rendered again.
 *
 * This occurs for two reasons:
 *
 * 1. The block represents an element in a list, and the element has been removed
 * 2. The block represents a conditional, and the condition has changed
 */
export interface ResettableBlock extends FixedBlock {
  reset(env: Environment): Nullable<SimpleNode>;
}

export interface DOMStack {
  pushRemoteElement(
    element: SimpleElement,
    guid: string,
    insertBefore: Maybe<SimpleNode>
  ): FixedBlock;
  popRemoteElement(): FixedBlock;
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

export interface TreeBuilder extends Cursor, DOMStack, TreeOperations {
  readonly cursors: Stack<Cursor>;
  readonly debug?: () => {
    blocks: AppendingBlock[];
    constructing: Nullable<SimpleElement>;
    cursors: Cursor[];
  };

  nextSibling: Nullable<SimpleNode>;
  dom: GlimmerTreeConstruction;
  updateOperations: GlimmerTreeChanges;
  constructing: Nullable<SimpleElement>;
  element: SimpleElement;

  hasBlocks: boolean;
  debugBlocks(): AppendingBlock[];

  pushAppendingBlock(): AppendingBlock;
  pushResettableBlock(): ResettableBlock;
  pushBlockList(list: Bounds[]): AppendingBlock;
  popBlock(): AppendingBlock;

  didAppendBounds(bounds: Bounds): void;
}

export interface AttributeCursor {
  element: SimpleElement;
  name: string;
  namespace: Nullable<AttrNamespace>;
}

export interface AttributeOperation {
  attribute: AttributeCursor;
  set(dom: TreeBuilder, value: unknown, env: Environment): void;
  update(value: unknown, env: Environment): void;
}
