import { Bounds, ConcreteBounds } from '../bounds';
import { moveNodesBefore, DOMChanges } from '../dom/helper';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

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
export default function applyInnerHTMLFix(document: Document, DOMChangesClass: typeof DOMChanges, svgNamespace: string): typeof DOMChanges {
  if (!document) return DOMChangesClass;

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
      return DOMChangesClass;
    }
    svg = null;
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

      // IE, Edge: also do not correctly support using `innerHTML` on SVG
      // namespaced elements. So here a wrapper is used.
      let wrappedHtml = '<svg>' + html + '</svg>';

      div.innerHTML = wrappedHtml;

      let [first, last] = moveNodesBefore(div.firstChild, parent, nextSibling);
      return new ConcreteBounds(parent, first, last);
    }
  };
}


export function fixSVG(this: void, useless: HTMLElement, _parent: Element, nextSibling: Node, html: string): Bounds { // tslint:disable-line
  let parent = _parent as HTMLElement;
    // IE, Edge: also do not correctly support using `innerHTML` on SVG
  // namespaced elements. So here a wrapper is used.
  let wrappedHtml = '<svg>' + html + '</svg>';

  useless.innerHTML = wrappedHtml;

  let [first, last] = moveNodesBefore(useless.firstChild, parent, nextSibling);
  return new ConcreteBounds(parent, first, last);
}
