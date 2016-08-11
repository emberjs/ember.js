import { Bounds, ConcreteBounds } from '../bounds';
import { moveNodesBefore, DOMChanges } from '../dom/helper';

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
export default function applyInnerHTMLFix(document: Document, DOMChangesClass: typeof DOMChanges): typeof DOMChanges {
  if (!document) return DOMChangesClass;

  let table = document.createElement('table');

  try {
    table.innerHTML = '<tbody></tbody>';
  } catch (e) {
  } finally {
    if (table.childNodes.length !== 0) {
      // It worked as expected, no fix required
      return DOMChangesClass;
    }
  }

  table = null;

  let div = document.createElement('div');

  return class DOMChangesWithInnerHTMLFix extends DOMChangesClass {
    insertHTMLBefore(parent: HTMLElement, nextSibling: Node, html: string): Bounds {
      if (html === null || html === '') {
        return super.insertHTMLBefore(parent, nextSibling, html);
      }

      let parentTag = parent.tagName.toLowerCase();
      let wrapper = innerHTMLWrapper[parentTag];

      if(wrapper === undefined) {
        return super.insertHTMLBefore(parent, nextSibling, html);
      }

      let wrappedHtml = wrapper.before + html + wrapper.after;

      div.innerHTML = wrappedHtml;

      let parentNode: Node = div;

      for (let i=0; i<wrapper.depth; i++) {
        parentNode = parentNode.childNodes[0];
      }

      let [first, last] = moveNodesBefore(parentNode, parent, nextSibling);
      return new ConcreteBounds(parent, first, last);
    }
  };
}

export function requiresInnerHTMLFix(parent: HTMLElement) {
  let parentTag = parent.tagName.toLowerCase();
  let wrapper = innerHTMLWrapper[parentTag];
  return wrapper !== undefined;
}

export function fixInnerHTML(this: void, useless: HTMLElement, _parent: Element, nextSibling: Node, html: string): Bounds { // tslint:disable-line
  let parent = _parent as HTMLElement;
  let parentTag = parent.tagName.toLowerCase();
  let wrapper = innerHTMLWrapper[parentTag];
  let wrappedHtml = wrapper.before + html + wrapper.after;

  useless.innerHTML = wrappedHtml;

  let parentNode: Node = useless;

  for (let i=0; i<wrapper.depth; i++) {
    parentNode = parentNode.childNodes[0];
  }

  let [first, last] = moveNodesBefore(parentNode, parent, nextSibling);
  return new ConcreteBounds(parent, first, last);
}
