import { Bounds, ConcreteBounds } from '../bounds';
import { moveNodesBefore, DOMChanges, DOMTreeConstruction } from '../dom/helper';
import { Option } from '@glimmer/util';

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
export function domChanges(document: Option<Document>, DOMChangesClass: typeof DOMChanges, svgNamespace: SVG_NAMESPACE): typeof DOMChanges {
  if (!document) return DOMChangesClass;

  if (!shouldApplyFix(document, svgNamespace)) {
    return DOMChangesClass;
  }

  let div = document.createElement('div');

  return class DOMChangesWithSVGInnerHTMLFix extends DOMChangesClass {
    insertHTMLBefore(parent: HTMLElement, nextSibling: Node, html: string): Bounds {
      if (html === null || html === '') {
        return super.insertHTMLBefore(parent, nextSibling, html);
      }

      if (parent.namespaceURI !== svgNamespace) {
        return super.insertHTMLBefore(parent, nextSibling, html);
      }

      return fixSVG(parent, div, html, nextSibling);
    }
  };
}

export function treeConstruction(document: Option<Document>, TreeConstructionClass: typeof DOMTreeConstruction, svgNamespace: SVG_NAMESPACE): typeof DOMTreeConstruction {
  if (!document) return TreeConstructionClass;

  if (!shouldApplyFix(document, svgNamespace)) {
    return TreeConstructionClass;
  }

  let div = document.createElement('div');

  return class TreeConstructionWithSVGInnerHTMLFix extends TreeConstructionClass {
    insertHTMLBefore(parent: HTMLElement, html: string,  reference: Node,): Bounds {
      if (html === null || html === '') {
        return super.insertHTMLBefore(parent, html, reference);
      }

      if (parent.namespaceURI !== svgNamespace) {
        return super.insertHTMLBefore(parent, html, reference);
      }

      return fixSVG(parent, div, html, reference);
    }
  };
}

function fixSVG(parent: Element, div: HTMLElement, html: string, reference: Node): Bounds {
  // IE, Edge: also do not correctly support using `innerHTML` on SVG
  // namespaced elements. So here a wrapper is used.
  let wrappedHtml = '<svg>' + html + '</svg>';

  div.innerHTML = wrappedHtml;

  let [first, last] = moveNodesBefore(div.firstChild as Node, parent, reference);
  return new ConcreteBounds(parent, first, last);
}

function shouldApplyFix(document: Document, svgNamespace: SVG_NAMESPACE) {
  let svg = document.createElementNS(svgNamespace, 'svg');

  try {
    svg['insertAdjacentHTML']('beforeEnd', '<circle></circle>');
  } catch (e) {
    // IE, Edge: Will throw, insertAdjacentHTML is unsupported on SVG
    // Safari: Will throw, insertAdjacentHTML is not present on SVG
  } finally {
    // FF: Old versions will create a node in the wrong namespace
    if (svg.childNodes.length === 1 && svg.firstChild.namespaceURI === SVG_NAMESPACE) {
      // The test worked as expected, no fix required
      return false;
    }

    return true;
  }
}
