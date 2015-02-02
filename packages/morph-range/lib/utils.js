// inclusive of both nodes
export function clear(parentNode, firstNode, lastNode) {
  var node = firstNode;
  var nextNode;
  do {
    nextNode = node.nextSibling;
    parentNode.removeChild(node);
    if (node === lastNode) {
      break;
    }
    node = nextNode;
  } while (node);
}

export function insertBefore(parentNode, firstNode, lastNode, _refNode) {
  var node = lastNode;
  var refNode = _refNode;
  var prevNode;
  do {
    prevNode = node.previousSibling;
    parentNode.insertBefore(node, refNode);
    if (node === firstNode) {
      break;
    }
    refNode = node;
    node = prevNode;
  } while (node);
}
