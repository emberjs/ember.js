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

export function validateChildMorphs(morph, visitor) {
  var morphList = morph.morphList;
  if (morph.morphList) {
    var current = morphList.firstChildMorph;

    while (current) {
      var next = current.nextMorph;
      validateChildMorphs(current, visitor);
      current = next;
    }
  } else if (morph.lastResult) {
    morph.lastResult.revalidateWith(undefined, undefined, visitor);
  } else if (morph.childNodes) {
    // This means that the childNodes were wired up manually
    for (var i=0, l=morph.childNodes.length; i<l; i++) {
      validateChildMorphs(morph.childNodes[i], visitor);
    }
  }
}

