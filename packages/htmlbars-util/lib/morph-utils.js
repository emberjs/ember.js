export function visitChildren(nodes, callback) {
  if (!nodes) { return; }

  while (nodes.length) {
    var node = nodes.pop();
    callback(node);

    if (node.childNodes) {
      nodes.push.apply(nodes, node.childNodes);
    } else if (node.firstChildMorph) {
      var current = node.firstChildMorph;

      while (current) {
        nodes.push(current);
        current = current.nextMorph;
      }
    } else if (node.morphList) {
      nodes.push(node.morphList);
    }
  }
}

