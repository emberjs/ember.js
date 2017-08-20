import { Bounds } from '../bounds';
import { DOMOperations } from '../dom/helper';
import { Option } from '@glimmer/util';

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
export function applyTextNodeMergingFix(document: Option<Document>, DOMClass: typeof DOMOperations): typeof DOMOperations {
  if (!document) return DOMClass;

  if (!shouldApplyFix(document)) {
    return DOMClass;
  }

  return class DOMChangesWithTextNodeMergingFix extends DOMClass {
    private uselessComment: Comment;

    constructor(document: Document) {
      super(document);
      this.uselessComment = document.createComment('');
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

function shouldApplyFix(document: Document) {
  let mergingTextDiv: HTMLDivElement = document.createElement('div');

  mergingTextDiv.innerHTML = 'first';
  mergingTextDiv.insertAdjacentHTML('beforeend', 'second');

  if (mergingTextDiv.childNodes.length === 2) {
    // It worked as expected, no fix required
    return false;
  }

  return true;
}
