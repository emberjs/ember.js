export default function TransformQuotedBindingsIntoJustBindings() {
  // set later within HTMLBars to the syntax package
  this.syntax = null;
}

/**
  @private
  @method transform
  @param {AST} ast The AST to be transformed.
*/
TransformQuotedBindingsIntoJustBindings.prototype.transform = function TransformQuotedBindingsIntoJustBindings_transform(ast) {
  let walker = new this.syntax.Walker();

  walker.visit(ast, node => {
    if (!validate(node)) { return; }

    let styleAttr = getStyleAttr(node);

    if (!validStyleAttr(styleAttr)) { return; }

    styleAttr.value = styleAttr.value.parts[0];
  });

  return ast;
};

function validate(node) {
  return node.type === 'ElementNode';
}

function validStyleAttr(attr) {
  if (!attr) { return false; }

  let value = attr.value;

  if (!value ||
      value.type !== 'ConcatStatement' ||
      value.parts.length !== 1) { return false; }

  let onlyPart = value.parts[0];

  return onlyPart.type === 'MustacheStatement';
}

function getStyleAttr(node) {
  let attributes = node.attributes;

  for (let i = 0; i < attributes.length; i++) {
    if (attributes[i].name === 'style') {
      return attributes[i];
    }
  }
}
