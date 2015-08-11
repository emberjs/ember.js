import isEnabled from 'ember-metal/features';

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
  let b = this.syntax.builders;

  hasSingleComponentNode(ast, component => {
    if (component.type === 'ComponentNode') {
      component.tag = `@${component.tag}`;
      component.isStatic = true;
    }
  }, element => {
    let hasTripleCurlies = element.attributes.some(attr => attr.value.escaped === false);

    if (element.modifiers.length || hasTripleCurlies) {
      return element;
    } else {
      // TODO: Properly copy loc from children
      let program = b.program(element.children);
      let component = b.component(`@<${element.tag}>`, element.attributes, program, element.loc);
      component.isStatic = true;
      return component;
    }
  });

  return ast;
};

function hasSingleComponentNode(program, componentCallback, elementCallback) {
  let { loc, body } = program;
  if (!loc || loc.start.line !== 1 || loc.start.column !== 0) { return; }

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
    componentCallback(lastComponentNode);
  } else if (isEnabled('ember-htmlbars-component-generation')) {
    let component = elementCallback(lastComponentNode);
    body.splice(lastIndex, 1, component);
  }
}

export default TransformTopLevelComponents;
