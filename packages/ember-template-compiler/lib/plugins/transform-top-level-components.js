export default function transformTopLevelComponent(env) {
  return {
    name: 'transform-top-level-component',

    visitors: {
      Program(node) {
        hasSingleComponentNode(node, component => {
          component.tag = `@${component.tag}`;
          component.isStatic = true;
        });
      }
    }
  };
}

function hasSingleComponentNode(program, componentCallback) {
  let { loc, body } = program;
  if (!loc || loc.start.line !== 1 || loc.start.column !== 0) { return; }

  let lastComponentNode;
  let nodeCount = 0;

  for (let i = 0; i < body.length; i++) {
    let curr = body[i];

    // text node with whitespace only
    if (curr.type === 'TextNode' && /^[\s]*$/.test(curr.chars)) { continue; }

    // has multiple root elements if we've been here before
    if (nodeCount++ > 0) { return false; }

    if (curr.type === 'ComponentNode' || curr.type === 'ElementNode') {
      lastComponentNode = curr;
    }
  }

  if (!lastComponentNode) { return; }

  if (lastComponentNode.type === 'ComponentNode') {
    componentCallback(lastComponentNode);
  }
}
