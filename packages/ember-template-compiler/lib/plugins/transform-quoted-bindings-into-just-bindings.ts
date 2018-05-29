import { AST, ASTPlugin } from '@glimmer/syntax';

export default function transformQuotedBindingsIntoJustBindings(/* env */): ASTPlugin {
  return {
    name: 'transform-quoted-bindings-into-just-bindings',

    visitor: {
      ElementNode(node: AST.ElementNode) {
        let styleAttr = getStyleAttr(node);

        if (!validStyleAttr(styleAttr)) {
          return;
        }

        styleAttr!.value = (styleAttr!.value as AST.ConcatStatement).parts[0];
      },
    },
  };
}

function validStyleAttr(attr: AST.AttrNode | undefined) {
  if (!attr) {
    return false;
  }

  let value = attr.value;

  if (!value || value.type !== 'ConcatStatement' || value.parts.length !== 1) {
    return false;
  }

  let onlyPart = value.parts[0];

  return onlyPart.type === 'MustacheStatement';
}

function getStyleAttr(node: AST.ElementNode): AST.AttrNode | undefined {
  let attributes = node.attributes;

  for (let i = 0; i < attributes.length; i++) {
    if (attributes[i].name === 'style') {
      return attributes[i];
    }
  }
  return undefined;
}
