import visitorKeys from '../types/visitor-keys';

function visitNode(node, visitor) {
  let handler = visitor[node.type];

  if (handler && handler.enter) {
    handler.enter.call(null, node);
  }

  visitChildNodes(node, visitor);

  if (handler && handler.exit) {
    handler.exit.call(null, node);
  }
}

function visitChildNodes(node, visitor) {
  let keys = visitorKeys[node.type];

  for (let i = 0; i < keys.length; i++) {
    let child = node[keys[i]];
    if (child) {
      if (Array.isArray(child)) {
        visitArrayOfNodes(child, visitor);
      } else {
        visitNode(child, visitor);
      }
    }
  }
}

function visitArrayOfNodes(nodes, visitor) {
  for (let i = 0; i < nodes.length; i++) {
    visitNode(nodes[i], visitor);
  }
}

export default function traverse(node, visitor) {
  visitNode(node, normalizeVisitor(visitor));
}

function normalizeVisitor(visitor) {
  let normalizedVisitor = {};

  for (let type in visitor) {
    let handler = visitor[type];

    if (typeof handler === 'object') {
      normalizedVisitor[type] = {
        enter: (typeof handler.enter === 'function') ? handler.enter : null,
        exit: (typeof handler.exit === 'function') ? handler.exit : null
      };
    } else if (typeof handler === 'function') {
      normalizedVisitor[type] = {
        enter: handler,
        exit: null
      };
    }
  }

  return normalizedVisitor;
}
