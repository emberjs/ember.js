import { Bounds } from '../bounds';
import { moveNodesBefore, DOMOperations } from '../dom/helper';
import { Option, unwrap, assert } from '@glimmer/util';
import { Simple } from '@glimmer/interfaces';

export const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
export type SVG_NAMESPACE = typeof SVG_NAMESPACE;

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
  document: Option<Document>,
  DOMClass: typeof DOMOperations,
  svgNamespace: SVG_NAMESPACE
): typeof DOMOperations {
  if (!document) return DOMClass;

  if (!shouldApplyFix(document, svgNamespace)) {
    return DOMClass;
  }

  let div = document.createElement('div');

  return class DOMChangesWithSVGInnerHTMLFix extends DOMClass {
    insertHTMLBefore(
      parent: Simple.Element,
      nextSibling: Option<Simple.Node>,
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
  parent: Simple.Element,
  div: HTMLElement,
  html: string,
  reference: Option<Simple.Node>
): Bounds {
  assert(html !== '', 'html cannot be empty');

  let source: Node;

  // This is important, because decendants of the <foreignObject> integration
  // point are parsed in the HTML namespace
  if (parent.tagName.toUpperCase() === 'FOREIGNOBJECT') {
    // IE, Edge: also do not correctly support using `innerHTML` on SVG
    // namespaced elements. So here a wrapper is used.
    let wrappedHtml = '<svg><foreignObject>' + html + '</foreignObject></svg>';

    div.innerHTML = wrappedHtml;

    source = div.firstChild!.firstChild!;
  } else {
    // IE, Edge: also do not correctly support using `innerHTML` on SVG
    // namespaced elements. So here a wrapper is used.
    let wrappedHtml = '<svg>' + html + '</svg>';

    div.innerHTML = wrappedHtml;

    source = div.firstChild!;
  }

  return moveNodesBefore(source, parent, reference);
}

function shouldApplyFix(document: Document, svgNamespace: SVG_NAMESPACE) {
  let svg = document.createElementNS(svgNamespace, 'svg');

  try {
    svg['insertAdjacentHTML']('beforeend', '<circle></circle>');
  } catch (e) {
    // IE, Edge: Will throw, insertAdjacentHTML is unsupported on SVG
    // Safari: Will throw, insertAdjacentHTML is not present on SVG
  } finally {
    // FF: Old versions will create a node in the wrong namespace
    if (svg.childNodes.length === 1 && unwrap(svg.firstChild).namespaceURI === SVG_NAMESPACE) {
      // The test worked as expected, no fix required
      return false;
    }

    return true;
  }
}
