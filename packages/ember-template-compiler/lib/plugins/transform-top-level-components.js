export default function TransformTopLevelComponents() {
  // set later within HTMLBars to the syntax package
  this.syntax = null;
}

/**
  @private
  @method transform
  @param {AST} The AST to be transformed.
*/
TransformTopLevelComponents.prototype.transform = function TransformTopLevelComponents_transform(ast) {
  hasSingleComponentNode(ast, component => {
    component.tag = `@${component.tag}`;
    component.isStatic = true;
  });

  return ast;
};

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
