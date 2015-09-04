/*globals console*/

export function visitChildren(nodes, callback) {
  if (!nodes || nodes.length === 0) { return; }

  nodes = nodes.slice();

  while (nodes.length) {
    var node = nodes.pop();
    callback(node);

    if (node.childNodes) {
      nodes.push.apply(nodes, node.childNodes);
    } else if (node.firstChildMorph) {
      let current = node.firstChildMorph;

      while (current) {
        nodes.push(current);
        current = current.nextMorph;
      }
    } else if (node.morphList) {
      let current = node.morphList.firstChildMorph;

      while (current) {
        nodes.push(current);
        current = current.nextMorph;
      }
    }
  }
}


export function validateChildMorphs(env, morph, visitor) {
  var morphList = morph.morphList;
  if (morph.morphList) {
    var current = morphList.firstChildMorph;

    while (current) {
      var next = current.nextMorph;
      validateChildMorphs(env, current, visitor);
      current = next;
    }
  } else if (morph.lastResult) {
    morph.lastResult.revalidateWith(env, undefined, undefined, undefined, visitor);
  } else if (morph.childNodes) {
    // This means that the childNodes were wired up manually
    for (var i=0, l=morph.childNodes.length; i<l; i++) {
      validateChildMorphs(env, morph.childNodes[i], visitor);
    }
  }
}

export class InternalParams {
  constructor(params, hash) {
    this.params = params || null;
    this.hash = hash || null;
    // REFACTOR TODO: Move templates here?
    // REFACTOR TODO: Move visitor here?
    // REFACTOR TODO: Custom one-level data?
  }
}

export function linkParams(env, scope, morph, path, params, hash) {
  if (morph.linkedParams) {
    return;
  }

  if (env.hooks.linkRenderNode(morph, env, scope, path, params, hash)) {
    morph.linkedParams = new InternalParams(params, hash);
  }
}

export function dump(node) {
  console.group(node, node.isDirty);

  if (node.childNodes) {
    map(node.childNodes, dump);
  } else if (node.firstChildMorph) {
    var current = node.firstChildMorph;

    while (current) {
      dump(current);
      current = current.nextMorph;
    }
  } else if (node.morphList) {
    dump(node.morphList);
  }

  console.groupEnd();
}

function map(nodes, cb) {
  for (var i=0, l=nodes.length; i<l; i++) {
    cb(nodes[i]);
  }
}
