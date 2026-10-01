import type { Nullable } from '../core.js';
import type { ModifierInstance } from '../runtime.js';
import type { AttrNamespace } from './simple.js';

export type ShellElementType = 1;
export type ShellTextType = 3;
export type ShellCommentType = 8;

export type ShellAttr = readonly [name: string, value: string, namespace: Nullable<AttrNamespace>];

/**
 * The static nodes of a block body: tags, static attributes, text and
 * comments. The browser builder clones them. The other builders, and shells
 * with custom elements or scripts, create them node by node.
 *
 * Nodes are numbered in document order (`index`). Opcodes refer to a node by
 * `anchor`, its position in `Shell.anchors`.
 */
export interface ShellElement {
  readonly type: ShellElementType;
  readonly tag: string;
  readonly attrs: readonly ShellAttr[];
  readonly children: readonly ShellNode[];
  readonly index: number;
  /** The index of the last node in this subtree. */
  readonly end: number;
  /** The position in `Shell.anchors`, or -1. */
  readonly anchor: number;
}

export interface ShellText {
  readonly type: ShellTextType;
  readonly value: string;
  readonly index: number;
  readonly end: number;
  readonly anchor: number;
}

export interface ShellComment {
  readonly type: ShellCommentType;
  readonly value: string;
  readonly index: number;
  readonly end: number;
  readonly anchor: number;
}

export type ShellNode = ShellElement | ShellText | ShellComment;

export type ShellWalkStep = ShellFirstChild | ShellNextSibling | ShellParent | ShellAnchor;
export type ShellFirstChild = 0;
export type ShellNextSibling = 1;
export type ShellParent = 2;
export type ShellAnchor = 3;

export interface Shell {
  /** Holds the top-level nodes. It is not a node itself: its index is -1. */
  readonly root: ShellElement;
  readonly anchors: readonly ShellNode[];
  /** The moves through a copy of the shell that visit the anchors in order. */
  readonly walk: readonly ShellWalkStep[];
  /** True if the shell has a custom element or a script, which must not be cloned. */
  readonly live: boolean;
}

export interface ShellBuilder {
  /** Starts the shell at the cursor. Its nodes appear in document order, around its dynamic parts. */
  openShell(shell: Shell): void;

  /** Makes the element at `anchor` the target of the attribute and modifier opcodes that follow. */
  openShellElement(anchor: number): void;

  /** For an element with modifiers or `...attributes`, after its attributes are set. */
  flushShellElement(modifiers: Nullable<ModifierInstance[]>): void;

  /** For an element with modifiers or `...attributes`, after its content. Returns its modifiers. */
  closeShellElement(anchor: number): Nullable<ModifierInstance[]>;

  /**
   * Moves the cursor into the element at `parent` (-1 for the shell's own
   * parent), before the node at `next` (-1 for the end).
   */
  pushShellCursor(parent: number, next: number): void;

  popShellCursor(parent: number): void;

  closeShell(): void;
}
