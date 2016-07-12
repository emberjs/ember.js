import { Bounds } from '../bounds';
import { DOMHelper } from '../dom/helper';

// Patch:    Adjacent text node merging fix
// Browsers: IE, Edge, Firefox w/o inspector open
// Reason:   These browsers will merge adjacent text nodes. For exmaple given
//           <div>Hello</div> with div.insertAdjacentHTML(' world') browsers
//           with proper behavior will populate div.childNodes with two items.
//           These browsers will populate it with one merged node instead.
// Fix:      Add these nodes to a wrapper element, then iterate the childNodes
//           of that wrapper and move the nodes to their target location. Note
//           that potential SVG bugs will have been handled before this fix.
//           Note that this fix must only apply to the previous text node, as
//           the base implementation of `insertHTMLBefore` already handles
//           following text nodes correctly.
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
    private uselessComment: Comment;

    constructor(document) {
      super(document);
      this.uselessComment = this.createComment('');
    }

    insertHTMLBefore(parent: HTMLElement, nextSibling: Node, html: string): Bounds {
      if (html === null) {
        return super.insertHTMLBefore(parent, nextSibling, html);
      }

      let didSetUselessComment = false;

      let nextPrevious = nextSibling ? nextSibling.previousSibling : parent.lastChild;
      if (nextPrevious && nextPrevious instanceof Text) {
        didSetUselessComment = true;
        parent.insertBefore(this.uselessComment, nextSibling);
      }

      let bounds = super.insertHTMLBefore(parent, nextSibling, html);

      if (didSetUselessComment) {
        parent.removeChild(this.uselessComment);
      }

      return bounds;
    }
  };
}
