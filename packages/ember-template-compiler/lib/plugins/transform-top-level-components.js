function TransformTopLevelComponents() {
  // set later within HTMLBars to the syntax package
  this.syntax = null;
}

/**
  @private
  @method transform
  @param {AST} The AST to be transformed.
*/
TransformTopLevelComponents.prototype.transform = function TransformTopLevelComponents_transform(ast) {
  hasSingleComponentNode(ast.body, component => {
    component.tag = `@${component.tag}`;
  });

  return ast;
};

function hasSingleComponentNode(body, callback) {
  let lastComponentNode;
  let lastIndex;
  let nodeCount = 0;

  for (let i = 0, l = body.length; i < l; i++) {
    let curr = body[i];

    // text node with whitespace only
    if (curr.type === 'TextNode' && /^[\s]*$/.test(curr.chars)) { continue; }

    // has multiple root elements if we've been here before
    if (nodeCount++ > 0) { return false; }

    if (curr.type === 'ComponentNode' || curr.type === 'ElementNode') {
      lastComponentNode = curr;
      lastIndex = i;
    }
  }

  if (!lastComponentNode) { return; }

  if (lastComponentNode.type === 'ComponentNode') {
    callback(lastComponentNode);
  }
}

export default TransformTopLevelComponents;
