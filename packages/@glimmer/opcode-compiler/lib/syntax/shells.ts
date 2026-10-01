import type { Shell, ShellAttr, ShellNode, ShellWalkStep, WireFormat } from '@glimmer/interfaces';
import {
  VM_CLOSE_SHELL_ELEMENT_OP,
  VM_CLOSE_SHELL_OP,
  VM_FLUSH_SHELL_ELEMENT_OP,
  VM_OPEN_SHELL_ELEMENT_OP,
  VM_OPEN_SHELL_OP,
  VM_POP_SHELL_CURSOR_OP,
  VM_PUSH_SHELL_CURSOR_OP,
  VM_PUT_COMPONENT_OPERATIONS_OP,
} from '@glimmer/constants/lib/syscall-ops';
import { opcodes as SexpOpcodes } from '@glimmer/wire-format/lib/opcodes';

import type { PushStatementOp } from './compilers';

import { shellOperand } from '../opcode-builder/operands';
import { inflateAttrName, inflateTagName, STATEMENTS } from './statements';

type Statement = WireFormat.Statement;

const HOLE = 0;
const ELEMENT = 1;
const TEXT = 3;
const COMMENT = 8;

const FIRST_CHILD = 0;
const NEXT_SIBLING = 1;
const PARENT = 2;
const ANCHOR = 3;

interface DraftElement {
  type: typeof ELEMENT;
  tag: string;
  attrs: ShellAttr[];
  // Attribute, modifier and `...attributes` statements, in source order.
  statements: Statement[];
  // Modifiers or `...attributes`: the attributes go through component
  // operations, and the element needs a flush and a close.
  hasFeatures: boolean;
  children: Draft[];
  anchor: number;
}

interface DraftLeaf {
  type: typeof TEXT | typeof COMMENT;
  value: string;
  anchor: number;
}

// Dynamic statements between static nodes.
interface DraftHole {
  type: typeof HOLE;
  statements: Statement[];
}

type Draft = DraftElement | DraftLeaf | DraftHole;
type DraftNode = DraftElement | DraftLeaf;

interface ParseState {
  index: number;
  live: boolean;
}

/**
 * Compiles a block body. Its static nodes become one shell, and only the
 * dynamic parts become opcodes.
 */
export function compileStatementList(op: PushStatementOp, statements: Statement[]): void {
  let state: ParseState = { index: 0, live: false };
  let children = parseChildren(statements, state);

  if (!children.some(isNode)) {
    for (const statement of statements) STATEMENTS.compile(op, statement);
    return;
  }

  let root: DraftElement = {
    type: ELEMENT,
    tag: '',
    attrs: [],
    statements: [],
    hasFeatures: false,
    children,
    anchor: -1,
  };

  op(VM_OPEN_SHELL_OP, shellOperand(buildShell(root, state.live)));
  compileChildren(op, root);
  op(VM_CLOSE_SHELL_OP);
}

function compileChildren(op: PushStatementOp, parent: DraftElement): void {
  let { children } = parent;

  for (let i = 0; i < children.length; i++) {
    let child = children[i] as Draft;

    if (child.type === HOLE) {
      let next = children[i + 1] as DraftNode | undefined;

      op(VM_PUSH_SHELL_CURSOR_OP, parent.anchor, next ? next.anchor : -1);
      for (const statement of child.statements) STATEMENTS.compile(op, statement);
      op(VM_POP_SHELL_CURSOR_OP, parent.anchor);
    } else if (child.type === ELEMENT) {
      compileElement(op, child);
    }
  }
}

function compileElement(op: PushStatementOp, element: DraftElement): void {
  if (element.hasFeatures) {
    op(VM_OPEN_SHELL_ELEMENT_OP, element.anchor);
    op(VM_PUT_COMPONENT_OPERATIONS_OP);
    for (const statement of element.statements) STATEMENTS.compile(op, statement);
    op(VM_FLUSH_SHELL_ELEMENT_OP);
    compileChildren(op, element);
    op(VM_CLOSE_SHELL_ELEMENT_OP, element.anchor);
    return;
  }

  if (element.statements.length > 0) {
    op(VM_OPEN_SHELL_ELEMENT_OP, element.anchor);
    for (const statement of element.statements) STATEMENTS.compile(op, statement);
  }

  if (hasDynamicContent(element)) {
    compileChildren(op, element);
  }
}

function hasDynamicContent(element: DraftElement): boolean {
  return element.children.some(
    (child) =>
      child.type === HOLE ||
      (child.type === ELEMENT &&
        (child.statements.length > 0 || child.hasFeatures || hasDynamicContent(child)))
  );
}

function isNode(draft: Draft): draft is DraftNode {
  return draft.type !== HOLE;
}

// Reads statements until the end of the list or of the current element.
function parseChildren(statements: Statement[], state: ParseState): Draft[] {
  let children: Draft[] = [];

  while (state.index < statements.length) {
    let statement = statements[state.index] as Statement;

    switch (statement[0]) {
      case SexpOpcodes.CloseElement:
        return children;

      case SexpOpcodes.OpenElement:
      case SexpOpcodes.OpenElementWithSplat:
        children.push(parseElement(statements, state));
        continue;

      case SexpOpcodes.Comment:
        children.push({ type: COMMENT, value: statement[1], anchor: -1 });
        state.index++;
        continue;

      case SexpOpcodes.Append:
      case SexpOpcodes.TrustingAppend: {
        let value = statement[1];

        if (!Array.isArray(value)) {
          children.push({
            type: TEXT,
            value: value === null || value === undefined ? '' : String(value),
            anchor: -1,
          });
          state.index++;
          continue;
        }
      }
    }

    let last = children[children.length - 1];

    if (last !== undefined && last.type === HOLE) {
      last.statements.push(statement);
    } else {
      children.push({ type: HOLE, statements: [statement] });
    }

    state.index++;
  }

  return children;
}

function parseElement(statements: Statement[], state: ParseState): DraftElement {
  let open = statements[state.index] as
    | WireFormat.Statements.OpenElement
    | WireFormat.Statements.OpenElementWithSplat;
  let tag = inflateTagName(open[1]);
  let hasFeatures = open[0] === SexpOpcodes.OpenElementWithSplat;

  // Custom elements run code when they are created, and scripts run when they
  // are inserted. A shell with either is created node by node.
  if (tag.indexOf('-') !== -1 || tag.toLowerCase() === 'script') {
    state.live = true;
  }

  let attrs: ShellAttr[] = [];
  let attributeStatements: Statement[] = [];

  for (state.index++; ; state.index++) {
    let statement = statements[state.index] as Statement;

    if (statement[0] === SexpOpcodes.FlushElement) break;

    // A static attribute after a dynamic one stays a statement, so the
    // attributes keep their source order.
    if (
      statement[0] === SexpOpcodes.StaticAttr &&
      !hasFeatures &&
      attributeStatements.length === 0
    ) {
      let [, name, value, namespace] = statement;
      attrs.push([inflateAttrName(name), value as string, (namespace ?? null) as ShellAttr[2]]);
    } else {
      attributeStatements.push(statement);
    }
  }

  state.index++;
  let children = parseChildren(statements, state);
  state.index++;

  return {
    type: ELEMENT,
    tag,
    attrs,
    statements: attributeStatements,
    hasFeatures,
    children,
    anchor: -1,
  };
}

/**
 * Numbers the nodes in document order and gives an anchor to each node that
 * an opcode refers to: elements with attribute statements or with dynamic
 * content, and the node after dynamic content. The walk visits the anchors
 * of a copy in the same order.
 */
function buildShell(root: DraftElement, live: boolean): Shell {
  let anchors: ShellNode[] = [];
  let walk: ShellWalkStep[] = [];
  let index = 0;

  // Starts and ends on `parent`'s node.
  function visitChildren(parent: DraftElement): ShellNode[] {
    let nodes: ShellNode[] = [];
    let moves: ShellWalkStep[] = [FIRST_CHILD];
    let moved = false;
    let previous: Draft | undefined;

    for (const child of parent.children) {
      if (child.type !== HOLE) {
        let mark = walk.length;
        for (const move of moves) walk.push(move);

        nodes.push(visit(child, previous));

        if (walk.length === mark + moves.length) {
          // Nothing in this subtree needed the walk.
          walk.length = mark;
          moves.push(NEXT_SIBLING);
        } else {
          moved = true;
          moves = [NEXT_SIBLING];
        }
      }

      previous = child;
    }

    if (moved) walk.push(PARENT);

    return nodes;
  }

  function visit(draft: DraftNode, previous: Draft | undefined): ShellNode {
    let nodeIndex = index++;
    let needsAnchor =
      (previous !== undefined && previous.type === HOLE) ||
      (draft.type === ELEMENT &&
        (draft.statements.length > 0 ||
          draft.hasFeatures ||
          draft.children.some((child) => child.type === HOLE)));

    if (needsAnchor) {
      draft.anchor = anchors.length;
      anchors.push(null as unknown as ShellNode);
      walk.push(ANCHOR);
    }

    let node: ShellNode;

    if (draft.type === ELEMENT) {
      let children = visitChildren(draft);

      node = {
        type: ELEMENT,
        tag: draft.tag,
        attrs: draft.attrs,
        children,
        index: nodeIndex,
        end: index - 1,
        anchor: draft.anchor,
      };
    } else {
      node = {
        type: draft.type,
        value: draft.value,
        index: nodeIndex,
        end: nodeIndex,
        anchor: draft.anchor,
      };
    }

    if (draft.anchor !== -1) anchors[draft.anchor] = node;

    return node;
  }

  let children = visitChildren(root);

  // Moves after the last anchor do nothing.
  while (walk.length > 0 && walk[walk.length - 1] !== ANCHOR) walk.pop();

  return {
    root: { type: ELEMENT, tag: '', attrs: [], children, index: -1, end: index - 1, anchor: -1 },
    anchors,
    walk,
    live,
  };
}
