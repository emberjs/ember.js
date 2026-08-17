import type { Hole, Nullable, StaticElement, StaticTree, WireFormat } from '@glimmer/interfaces';
import { opcodes as SexpOpcodes } from '@glimmer/wire-format/lib/opcodes';

import { inflateAttrName, inflateTagName } from './syntax/statements';

// One element trades a few DOM calls for a clone plus an insert, which is
// not a clear win.
const MIN_ELEMENTS = 2;

export interface ExtractedRun {
  /** how many statements of the input the run consumed */
  readonly length: number;
  readonly tree: StaticTree;
  /** the statement index of each hole, parallel to `tree.holes` */
  readonly holeStatements: readonly number[];
}

function childCount(counts: number[]): number {
  return counts[counts.length - 1] ?? 0;
}

function bumpChildCount(counts: number[]): void {
  counts[counts.length - 1] = childCount(counts) + 1;
}

function isDynamicAttr(op: number): boolean {
  return (
    op === SexpOpcodes.DynamicAttr ||
    op === SexpOpcodes.TrustingDynamicAttr ||
    op === SexpOpcodes.ComponentAttr ||
    op === SexpOpcodes.TrustingComponentAttr
  );
}

// Returns null when the run cannot be described. Bailing is always safe:
// the caller compiles the statements the ordinary way.
export function extractStaticTree(
  statements: WireFormat.Statement[],
  start: number
): Nullable<ExtractedRun> {
  let first = statements[start];

  if (!first || first[0] !== SexpOpcodes.OpenElement) return null;

  let holes: Hole[] = [];
  let holeStatements: number[] = [];
  let elements = 0;

  // the element currently being opened, before its FlushElement
  let pending: { tag: string; attrs: [string, string, Nullable<string>][] } | null = null;
  // path of child indices to the element we are inside
  let path: number[] = [];
  // for each open element, how many children it has so far
  let counts: number[] = [0];
  let stack: StaticElement[] = [];
  let root: Nullable<StaticElement> = null;

  for (let i = start; i < statements.length; i++) {
    let statement = statements[i];
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- bounds checked
    let op = statement![0];

    if (op === SexpOpcodes.OpenElement) {
      if (pending) return null;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- shape of OpenElement
      pending = { tag: inflateTagName(statement![1] as string), attrs: [] };
      elements++;
      continue;
    }

    if (op === SexpOpcodes.StaticAttr) {
      if (!pending) return null;
      let [, name, value, namespace] = statement as WireFormat.Statements.StaticAttr;
      pending.attrs.push([
        inflateAttrName(name),
        String(value ?? ''),
        (namespace as string) ?? null,
      ]);
      continue;
    }

    if (isDynamicAttr(op)) {
      if (!pending) return null;
      // The target is the element about to be flushed. Paths are relative to
      // the run's root, so the root itself is the empty path.
      let target = stack.length === 0 ? [] : path.concat([childCount(counts)]);
      holes.push({ kind: 'attr', path: target });
      holeStatements.push(i);
      continue;
    }

    if (op === SexpOpcodes.FlushElement) {
      if (!pending) return null;
      let element: StaticElement = {
        kind: 'element',
        tag: pending.tag,
        attrs: pending.attrs,
        children: [],
      };
      let parent = stack[stack.length - 1];

      if (parent) {
        parent.children.push(element);
      } else {
        root = element;
      }

      let indexInParent = childCount(counts);
      bumpChildCount(counts);

      // the root is the origin of every path, so it does not contribute one
      if (stack.length > 0) path.push(indexInParent);

      counts.push(0);
      stack.push(element);
      pending = null;
      continue;
    }

    if (op === SexpOpcodes.CloseElement) {
      if (pending || stack.length === 0) return null;
      stack.pop();
      counts.pop();

      // mirrors the push above: the root contributed no path segment
      if (stack.length > 0) path.pop();

      if (stack.length === 0) {
        // the run's root element closed: this is a complete tree
        if (!root || elements < MIN_ELEMENTS) return null;
        return { length: i - start + 1, tree: { root, holes }, holeStatements };
      }
      continue;
    }

    if (op === SexpOpcodes.Append || op === SexpOpcodes.TrustingAppend) {
      if (pending || stack.length === 0) return null;

      let value = (statement as WireFormat.Statements.Append)[1];

      if (!Array.isArray(value)) {
        // a static string: part of the structure, not a hole
        if (op === SexpOpcodes.TrustingAppend) return null;
        let parent = stack[stack.length - 1] as StaticElement;
        parent.children.push({ kind: 'text', chars: value === null ? '' : String(value) });
        bumpChildCount(counts);
        continue;
      }

      // Trusted content inserts arbitrary parsed HTML: no fixed shape.
      if (op === SexpOpcodes.TrustingAppend) return null;

      // A hole that is not the last child needs a placeholder node to anchor
      // against, which costs more than it saves.
      let next = statements[i + 1];

      if (!next || next[0] !== SexpOpcodes.CloseElement) return null;

      holes.push({ kind: 'content', path: path.slice() });
      holeStatements.push(i);
      bumpChildCount(counts);
      continue;
    }

    // components, blocks, splattributes, modifiers, comments, in-element:
    // all need the full VM
    return null;
  }

  return null;
}
