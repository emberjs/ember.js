import type { WireFormat } from '@glimmer/interfaces';
import { opcodes as SexpOpcodes } from '@glimmer/wire-format/lib/opcodes';

/**
 * SPIKE: clone-based rendering — build-time analysis.
 *
 * Detects a block whose entire body is a single *static-shape* element tree with
 * only "leaf" dynamics (dynamic attributes, and dynamic text content that is the
 * sole child of its element). For such a block the precompiler emits a
 * `SerializedCloneTemplate`: the static skeleton HTML plus a positional list of
 * dynamic parts. At runtime the skeleton is `cloneNode`d per instance and only
 * the dynamic parts run — instead of executing node-by-node element-building
 * opcodes for every instance.
 *
 * Anything outside the supported subset (components, nested blocks, modifiers,
 * `...attributes`, yields, namespaced attrs, static text mixed with dynamic
 * content, multiple roots, …) makes the block non-clonable → `null`, and the
 * block compiles through the normal opcode path.
 *
 * Paths in `p` are relative to the single cloned root element (so `[]` is the
 * root itself, `[0]` its first child, `[1,0]` the first child of its second
 * child, …). The skeleton HTML is generated with no inter-tag whitespace, so a
 * clone's `childNodes` indices line up with these paths exactly.
 */

// Well-known name tables (wire format deflates these to numeric indices).
const INFLATE_ATTR_TABLE = ['class', 'id', 'value', 'name', 'type', 'style', 'href'];
const INFLATE_TAG_TABLE = ['div', 'span', 'p', 'a'];

function inflateTagName(tagName: string | number): string {
  return typeof tagName === 'string' ? tagName : (INFLATE_TAG_TABLE[tagName] as string);
}

function inflateAttrName(attrName: string | number): string {
  return typeof attrName === 'string' ? attrName : (INFLATE_ATTR_TABLE[attrName] as string);
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

export function analyzeClonable(
  statements: WireFormat.Statement[]
): WireFormat.SerializedCloneTemplate | null {
  if (statements.length === 0) return null;

  let html = '';
  const parts: WireFormat.SerializedClonePart[] = [];
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
        const parent = frames[frames.length - 1];
        const index = parent ? parent.childCount : rootChildCount;
        constructing = {
          tag: inflateTagName(statement[1] as string | number),
          attrs: '',
          path: frames.length === 0 ? [] : [...insidePath(), index],
        };
        break;
      }

      case StaticAttr: {
        if (!constructing || statement[3] != null || typeof statement[2] !== 'string') return null;
        constructing.attrs += ` ${inflateAttrName(statement[1] as string | number)}="${escapeAttr(statement[2])}"`;
        break;
      }

      case DynamicAttr:
      case TrustingDynamicAttr: {
        if (!constructing || statement[3] != null) return null;
        parts.push({
          k: 'a',
          p: constructing.path.slice(),
          e: statement[2] as WireFormat.Expression,
          n: inflateAttrName(statement[1] as string | number),
          t: (statement[0] as number) === TrustingDynamicAttr,
        });
        break;
      }

      case FlushElement: {
        if (!constructing) return null;
        html += `<${constructing.tag}${constructing.attrs}>`;
        const parent = frames[frames.length - 1];
        const index = parent ? parent.childCount : rootChildCount;
        if (parent) {
          parent.childCount++;
        } else {
          rootChildCount++;
          rootElementCount++;
          if (rootElementCount > 1) return null; // more than one root element
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
        parts.push({ k: 'c', p: insidePath(), e: statement[1] as WireFormat.Expression });
        break;
      }

      case Comment: {
        const frame = frames[frames.length - 1];
        if (constructing || !frame || frame.hasDynamicContent) return null;
        html += `<!--${statement[1] as string}-->`;
        frame.childCount++;
        break;
      }

      case CloseElement: {
        if (constructing) return null;
        const closing = frames.pop();
        if (!closing) return null;
        html += `</${closing.tag}>`;
        break;
      }

      default:
        return null;
    }
  }

  if (frames.length !== 0 || constructing) return null;
  if (rootElementCount !== 1) return null; // require exactly one root element
  if (parts.length === 0 || html.length === 0) return null;

  return { h: html, p: parts };
}
