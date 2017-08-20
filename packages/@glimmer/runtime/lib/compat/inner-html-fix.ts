import { Bounds, ConcreteBounds } from '../bounds';
import { moveNodesBefore, DOMOperations } from '../dom/helper';
import { Option } from '@glimmer/util';

interface Wrapper {
  depth: number;
  before: string;
  after: string;
}

let innerHTMLWrapper = {
  colgroup: { depth: 2, before: '<table><colgroup>', after: '</colgroup></table>' },
  table:    { depth: 1, before: '<table>', after: '</table>' },
  tbody:    { depth: 2, before: '<table><tbody>', after: '</tbody></table>' },
  tfoot:    { depth: 2, before: '<table><tfoot>', after: '</tfoot></table>' },
  thead:    { depth: 2, before: '<table><thead>', after: '</thead></table>' },
  tr:       { depth: 3, before: '<table><tbody><tr>', after: '</tr></tbody></table>' }
};

// Patch:    innerHTML Fix
// Browsers: IE9
// Reason:   IE9 don't allow us to set innerHTML on col, colgroup, frameset,
//           html, style, table, tbody, tfoot, thead, title, tr.
// Fix:      Wrap the innerHTML we are about to set in its parents, apply the
//           wrapped innerHTML on a div, then move the unwrapped nodes into the
//           target position.
export function applyInnerHTMFix(document: Option<Document>, DOMClass: typeof DOMOperations): typeof DOMOperations {
  if (!document) return DOMClass;

  if (!shouldApplyFix(document)) {
    return DOMClass;
  }

  let div = document.createElement('div');

  return class DOMChangesWithInnerHTMLFix extends DOMClass {
    insertHTMLBefore(parent: HTMLElement, nextSibling: Node, html: string): Bounds {
      if (html === null || html === '') {
        return super.insertHTMLBefore(parent, nextSibling, html);
      }

      let parentTag = parent.tagName.toLowerCase();
      let wrapper = innerHTMLWrapper[parentTag];

      if(wrapper === undefined) {
        return super.insertHTMLBefore(parent, nextSibling, html);
      }

      return fixInnerHTML(parent, wrapper, div, html, nextSibling);
    }
  };
}

function fixInnerHTML(parent: HTMLElement, wrapper: Wrapper, div: HTMLElement, html: string, reference: Node): Bounds {
  let wrappedHtml = wrapper.before + html + wrapper.after;

  div.innerHTML = wrappedHtml;

  let parentNode: Node = div;

  for (let i=0; i<wrapper.depth; i++) {
    parentNode = parentNode.childNodes[0];
  }

  let [first, last] = moveNodesBefore(parentNode, parent, reference);
  return new ConcreteBounds(parent, first, last);
}

function shouldApplyFix(document: Document) {
  let table = document.createElement('table');
  try {
    table.innerHTML = '<tbody></tbody>';
  } catch (e) {
  } finally {
    if (table.childNodes.length !== 0) {
      // It worked as expected, no fix required
      return false;
    }
  }

  return true;
}
