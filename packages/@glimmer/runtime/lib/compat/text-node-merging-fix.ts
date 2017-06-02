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
export function fixTextNodeMerging(parent: HTMLElement, reference: Node, uselessComment: Comment) {
  let didSetUselessComment = false;
  let nextPrevious = reference ? reference.previousSibling : parent.lastChild;
  if (nextPrevious && nextPrevious instanceof Text) {
    didSetUselessComment = true;
    parent.insertBefore(uselessComment, reference);
  }

  return didSetUselessComment;
}

export function needsTextNodeFix(document: Document) {
  let mergingTextDiv: HTMLDivElement = document.createElement('div');

  mergingTextDiv.innerHTML = 'first';
  mergingTextDiv.insertAdjacentHTML('beforeend', 'second');

  if (mergingTextDiv.childNodes.length === 2) {
    // It worked as expected, no fix required
    return false;
  }

  return true;
}
