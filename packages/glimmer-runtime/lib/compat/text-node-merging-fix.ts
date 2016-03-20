import { Bounds, ConcreteBounds } from '../bounds';
import { moveNodesBefore, DOMHelper } from '../dom';

// Patch:    Adjacent text node merging fix
// Browsers: IE, Edge, Firefox
// Reason:   These browsers will merge adjacent text nodes. For exmaple given
//           <div>Hello</div> with div.insertAdjacentHTML(' world') browsers
//           with proper behavior will populate div.childNodes with two items.
//           These browsers will populate it with one merged node instead.
// Fix:      Add these nodes to a wrapper element, then iterate the childNodes
//           of that wrapper and move the nodes to their target location. Note
//           that potential SVG bugs will have been handled before this fix.
export default function applyTextNodeMergingFix(document: Document, DOMHelperClass: typeof DOMHelper): typeof DOMHelper {
  if (!document) return DOMHelperClass;

  let mergingTextDiv = <HTMLElement> document.createElement('div');

  mergingTextDiv.innerHTML = 'first';
  mergingTextDiv.insertAdjacentHTML('beforeEnd', 'second');

  if (mergingTextDiv.childNodes.length === 2) {
    // It worked as expected, no fix required
    return DOMHelperClass;
  }

  mergingTextDiv = null;

  return class DOMHelperWithTextNodeMergingFix extends DOMHelperClass {
    insertHTMLBefore(parent: HTMLElement, nextSibling: Node, html: string): Bounds {
      if (html === null) {
        return super.insertHTMLBefore(parent, nextSibling, html);
      }

      let wrapper = parent.cloneNode(false);

      wrapper.innerHTML = html;

      let [first, last] = moveNodesBefore(wrapper, parent, nextSibling);
      return new ConcreteBounds(parent, first, last);
    }
  };
}
