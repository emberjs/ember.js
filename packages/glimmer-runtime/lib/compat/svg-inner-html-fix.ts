import { Bounds, ConcreteBounds } from '../bounds';
import { DOMHelper } from '../dom';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

// Patch:    insertAdjacentHTML, innerHTML on SVG Fix
// Browsers: Safari, IE9 - Edge, Firefox ~33-34
// Reason:   insertAdjacentHTML does not exist on SVG elements in Safari and MS
//           browsers. Additionally, innerHTML does not work on SVG elements in
//           MS browsers. Additionally, innerHTML sets the wrong namespace on
//           olf Firefox versions.
// Fix:      Wrap the innerHTML we are about to set in its parents, apply the
//           wrapped innerHTML on a div, then move the unwrapped nodes into the
//           target position.
export default function applyInnerHTMLFix(document: Document, DOMHelperClass: typeof DOMHelper, svgNamespace: String): typeof DOMHelper {
  if (!document) return DOMHelperClass;

  let svg = document.createElementNS(svgNamespace, 'svg');

  try {
    // This will throw if insertAdjacentHTML is unavailable (Safari)
    svg.insertAdjacentHTML('beforeEnd', 'throws if insertAdjacentHTML on SVG is unsupported');
    // If it doesn't throw, then test `innerHTML`
    svg.innerHTML = '<circle></circle>';
  } catch (e) {
  } finally {
    // IE will not have populated children
    // Old FF will have the wrong namespace
    if (svg.childNodes.length === 1 && svg.firstChild.namespaceURI === SVG_NAMESPACE) {
      // It worked as expected, no fix required
      return DOMHelperClass;
    }
  }

  let div = document.createElement('div');

  return class DOMHelperWithSVGInnerHTMLFix extends DOMHelperClass {
    insertHTMLBefore(parent: HTMLElement, nextSibling: Node, html: string): Bounds {
      if (html === null || html === '') {
        return super.insertHTMLBefore(parent, nextSibling, html);
      }

      if (parent.namespaceURI !== svgNamespace) {
        return super.insertHTMLBefore(parent, nextSibling, html);
      }

      let wrappedHtml = '<svg>' + html + '</svg>';

      div.innerHTML = wrappedHtml;

      let first: Node, last: Node, current: Node;
      first = current = div.firstChild.firstChild;

      while (current) {
        last = current;
        parent.insertBefore(current, nextSibling);
        current = current.nextSibling;
      }

      return new ConcreteBounds(parent, first, last);
    }
  };
}
