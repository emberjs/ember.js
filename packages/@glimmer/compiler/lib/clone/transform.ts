import type { Nullable, WireFormat } from '@glimmer/interfaces';
import { opcodes as SexpOpcodes } from '@glimmer/wire-format/lib/opcodes';

import { analyzeClonable } from './analyze';

/**
 * SPIKE: clone-based rendering — build-time transform.
 *
 * Walks a serialized template block, and for every (inline) block whose body is
 * a clonable static-shape element tree, attaches a `SerializedCloneTemplate`
 * descriptor (see `./analyze`). This runs once at precompile time, so the
 * runtime never analyzes templates — it just clones + binds from the descriptor.
 */

type InlineBlock = WireFormat.SerializedInlineBlock;
type Statement = WireFormat.Statement;

const {
  If,
  Each,
  Let,
  WithDynamicVars,
  InElement,
  Block,
  StrictBlock,
  Component,
  InvokeComponent,
} = SexpOpcodes;

/** Visit each inline block directly contained by `statement`. */
function eachInlineBlock(statement: Statement, visit: (block: InlineBlock) => void): void {
  const op = statement[0] as number;

  switch (op) {
    case If: // [op, condition, block, inverse]
      maybeVisit(statement[2], visit);
      maybeVisit(statement[3], visit);
      break;
    case Each: // [op, condition, key, block, inverse]
      maybeVisit(statement[3], visit);
      maybeVisit(statement[4], visit);
      break;
    case Let: // [op, positional, block]
    case WithDynamicVars: // [op, hash, block]
      maybeVisit(statement[2], visit);
      break;
    case InElement: // [op, block, guid, destination, insertBefore?]
      maybeVisit(statement[1], visit);
      break;
    case Block: // [op, ..., blocks]
    case StrictBlock:
    case Component: // [op, tag, params, args, blocks]
    case InvokeComponent: // [op, definition, positional, named, blocks]
      visitNamedBlocks(statement[statement.length - 1] as WireFormat.Core.Blocks, visit);
      break;
    default:
      break;
  }
}

function maybeVisit(block: unknown, visit: (block: InlineBlock) => void): void {
  if (Array.isArray(block) && Array.isArray(block[0])) visit(block as InlineBlock);
}

function visitNamedBlocks(
  blocks: Nullable<WireFormat.Core.Blocks>,
  visit: (block: InlineBlock) => void
): void {
  // Blocks = [names: string[], blocks: SerializedInlineBlock[]]
  if (!blocks) return;
  const list = blocks[1];
  if (!Array.isArray(list)) return;
  for (const block of list) maybeVisit(block, visit);
}

function processStatements(statements: Statement[]): void {
  for (const statement of statements) {
    if (!Array.isArray(statement)) continue;
    eachInlineBlock(statement, processInlineBlock);
  }
}

function processInlineBlock(block: InlineBlock): void {
  const descriptor = analyzeClonable(block[0]);
  if (descriptor) block[2] = descriptor;
  // Recurse: a non-clonable block may still contain clonable children.
  processStatements(block[0]);
}

/** Mutates `block` in place, attaching clone descriptors throughout the tree. */
export function attachCloneDescriptors(block: WireFormat.SerializedTemplateBlock): void {
  const statements = block[0];
  const descriptor = analyzeClonable(statements);
  if (descriptor) block[3] = descriptor;
  processStatements(statements);
}
