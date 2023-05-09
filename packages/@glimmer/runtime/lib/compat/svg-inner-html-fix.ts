import {
  type Bounds,
  type Option,
  type SimpleDocument,
  type SimpleElement,
  type SimpleNode,
} from '@glimmer/interfaces';
import {
  assert,
  castToBrowser,
  clearElement,
  INSERT_AFTER_BEGIN,
  INSERT_BEFORE_END,
  NS_SVG,
  unwrap,
} from '@glimmer/util';

import { type DOMOperations, moveNodesBefore } from '../dom/operations';

export enum InsertPosition {
  beforebegin = 'beforebegin',
  afterbegin = 'afterbegin',
  beforeend = 'beforeend',
  afterend = 'afterend',
}

// Patch:    insertAdjacentHTML on SVG Fix
// Browsers: Safari, IE, Edge, Firefox ~33-34
// Reason:   insertAdjacentHTML does not exist on SVG elements in Safari. It is
//           present but throws an exception on IE and Edge. Old versions of
//           Firefox create nodes in the incorrect namespace.
// Fix:      Since IE and Edge silently fail to create SVG nodes using
//           innerHTML, and because Firefox may create nodes in the incorrect
//           namespace using innerHTML on SVG elements, an HTML-string wrapping
//           approach is used. A pre/post SVG tag is added to the string, then
//           that whole string is added to a div. The created nodes are plucked
//           out and applied to the target location on DOM.
export function applySVGInnerHTMLFix(
  document: Option<SimpleDocument>,
  DOMClass: typeof DOMOperations,
  svgNamespace: typeof NS_SVG
): typeof DOMOperations {
  if (!document) return DOMClass;

  if (!shouldApplyFix(document, svgNamespace)) {
    return DOMClass;
  }

  const div = document.createElement('div');

  return class DOMChangesWithSVGInnerHTMLFix extends DOMClass {
    override insertHTMLBefore(
      parent: SimpleElement,
      nextSibling: Option<SimpleNode>,
      html: string
    ): Bounds {
      if (html === '') {
        return super.insertHTMLBefore(parent, nextSibling, html);
      }

      if (parent.namespaceURI !== svgNamespace) {
        return super.insertHTMLBefore(parent, nextSibling, html);
      }

      return fixSVG(parent, div, html, nextSibling);
    }
  };
}

function fixSVG(
  parent: SimpleElement,
  div: SimpleElement,
  html: string,
  reference: Option<SimpleNode>
): Bounds {
  assert(html !== '', 'html cannot be empty');

  let source: SimpleNode;

  // This is important, because descendants of the <foreignObject> integration
  // point are parsed in the HTML namespace
  if (parent.tagName.toUpperCase() === 'FOREIGNOBJECT') {
    // IE, Edge: also do not correctly support using `innerHTML` on SVG
    // namespaced elements. So here a wrapper is used.
    const wrappedHtml = '<svg><foreignObject>' + html + '</foreignObject></svg>';

    clearElement(div);
    div.insertAdjacentHTML(INSERT_AFTER_BEGIN, wrappedHtml);

    source = div.firstChild!.firstChild!;
  } else {
    // IE, Edge: also do not correctly support using `innerHTML` on SVG
    // namespaced elements. So here a wrapper is used.
    const wrappedHtml = '<svg>' + html + '</svg>';

    clearElement(div);
    div.insertAdjacentHTML(INSERT_AFTER_BEGIN, wrappedHtml);

    source = div.firstChild!;
  }

  return moveNodesBefore(source, parent, reference);
}

function shouldApplyFix(document: SimpleDocument, svgNamespace: typeof NS_SVG) {
  const svg = document.createElementNS(svgNamespace, 'svg');

  try {
    svg.insertAdjacentHTML(INSERT_BEFORE_END, '<circle></circle>');
  } catch (e) {
    // IE, Edge: Will throw, insertAdjacentHTML is unsupported on SVG
    // Safari: Will throw, insertAdjacentHTML is not present on SVG
  } finally {
    // FF: Old versions will create a node in the wrong namespace
    if (
      svg.childNodes.length === 1 &&
      castToBrowser(unwrap(svg.firstChild), 'SVG').namespaceURI === NS_SVG
    ) {
      // The test worked as expected, no fix required
      return false;
    }

    return true;
  }
}
