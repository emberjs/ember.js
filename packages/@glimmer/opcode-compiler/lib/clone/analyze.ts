import { opcodes as SexpOpcodes } from '@glimmer/wire-format/lib/opcodes';

import { inflateAttrName, inflateTagName } from '../syntax/statements';

/**
 * SPIKE: clone-based rendering.
 *
 * Detects a block whose entire body is a single *static-shape* element tree with
 * only "leaf" dynamics (dynamic attributes, and dynamic text content that is the
 * sole child of its element). For such a block we build the static skeleton HTML
 * once, `cloneNode` it per instance, and run only the dynamic parts — instead of
 * executing node-by-node element-building opcodes for every instance.
 *
 * Anything outside the supported subset (components, nested blocks, modifiers,
 * `...attributes`, yields, namespaced attrs, static text mixed with dynamic
 * content, multiple roots, …) makes the block non-clonable → fall back to normal
 * opcode compilation.
 *
 * Paths in `parts` are relative to the single cloned root element (so `[]` is the
 * root itself, `[0]` its first child, `[1,0]` the first child of its second
 * child, …). The skeleton HTML is generated with no inter-tag whitespace, so a
 * clone's `childNodes` indices line up with these paths exactly.
 */

export interface ClonePart {
  kind: 'attr' | 'content';
  path: number[];
  valueExpr: unknown; // the expression whose ref is bound to the clone node
  attrName?: string; // attr parts only
  trusting?: boolean; // attr parts only
}

export interface CloneTemplate {
  html: string;
  parts: ClonePart[];
}

const { OpenElement, FlushElement, CloseElement, StaticAttr } = SexpOpcodes;
const { DynamicAttr, TrustingDynamicAttr, Append, TrustingAppend, Comment } = SexpOpcodes;

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

interface Frame {
  tag: string;
  childCount: number;
  hasDynamicContent: boolean;
  index: number; // this element's index within its parent
}

export function analyzeClonable(statements: unknown[]): CloneTemplate | null {
  if (statements.length === 0) return null;

  let html = '';
  const parts: ClonePart[] = [];
  const frames: Frame[] = [];
  let rootChildCount = 0;
  let rootElementCount = 0; // top-level elements (must be exactly one)
  let constructing: { tag: string; attrs: string; path: number[] } | null = null;

  // Path (relative to the eventual single root element) of the element we are
  // currently *inside*. frames[0] is the root, so the "inside" path drops it.
  const insidePath = (): number[] => frames.slice(1).map((f) => f.index);

  for (const statement of statements) {
    if (!Array.isArray(statement)) return null;

    switch (statement[0] as number) {
      case OpenElement: {
        if (constructing) return null;
        const index = frames.length === 0 ? rootChildCount : frames[frames.length - 1]!.childCount;
        constructing = {
          tag: inflateTagName(statement[1] as never),
          attrs: '',
          // path to this element, relative to root (root itself => [])
          path: frames.length === 0 ? [] : [...insidePath(), index],
        };
        break;
      }

      case StaticAttr: {
        if (!constructing || statement[3] != null || typeof statement[2] !== 'string') return null;
        constructing.attrs += ` ${inflateAttrName(statement[1] as never)}="${escapeAttr(statement[2])}"`;
        break;
      }

      case DynamicAttr:
      case TrustingDynamicAttr: {
        if (!constructing || statement[3] != null) return null;
        parts.push({
          kind: 'attr',
          path: constructing.path.slice(),
          valueExpr: statement[2],
          attrName: inflateAttrName(statement[1] as never),
          trusting: (statement[0] as number) === TrustingDynamicAttr,
        });
        break;
      }

      case FlushElement: {
        if (!constructing) return null;
        html += `<${constructing.tag}${constructing.attrs}>`;
        const index = frames.length === 0 ? rootChildCount : frames[frames.length - 1]!.childCount;
        if (frames.length === 0) {
          rootChildCount++;
          rootElementCount++;
          if (rootElementCount > 1) return null; // more than one root element
        } else {
          frames[frames.length - 1]!.childCount++;
        }
        frames.push({ tag: constructing.tag, childCount: 0, hasDynamicContent: false, index });
        constructing = null;
        break;
      }

      case Append:
      case TrustingAppend: {
        if (constructing) return null;

        // `Append` with a string value is *static text*. It's emitted into the
        // skeleton (occupying a child slot, keeping later paths aligned). Only
        // cautious (escaped) static text is supported — trusting raw HTML bails.
        // This includes top-level whitespace text around the root element.
        if (typeof statement[1] === 'string') {
          if ((statement[0] as number) === TrustingAppend) return null;
          const frame = frames[frames.length - 1];
          if (frame) {
            if (frame.hasDynamicContent) return null; // text sibling after dynamic content
            frame.childCount++;
          } else {
            rootChildCount++;
          }
          html += escapeText(statement[1]);
          break;
        }

        // Dynamic content (an expression). Only supported inside an element, as
        // the sole child, so the skeleton can leave the slot empty.
        const frame = frames[frames.length - 1];
        if (!frame || frame.childCount !== 0 || frame.hasDynamicContent) return null;
        frame.hasDynamicContent = true;
        parts.push({ kind: 'content', path: insidePath(), valueExpr: statement[1] });
        break;
      }

      case Comment: {
        const frame = frames[frames.length - 1];
        if (constructing || !frame || frame.hasDynamicContent) return null;
        html += `<!--${statement[1]}-->`;
        frame.childCount++;
        break;
      }

      case CloseElement: {
        if (constructing || frames.length === 0) return null;
        html += `</${frames.pop()!.tag}>`;
        break;
      }

      default:
        return null;
    }
  }

  if (frames.length !== 0 || constructing) return null;
  if (rootElementCount !== 1) return null; // require exactly one root element
  if (parts.length === 0 || html.length === 0) return null;

  return { html, parts };
}
