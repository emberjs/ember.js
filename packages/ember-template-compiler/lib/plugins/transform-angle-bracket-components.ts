import { ASTPlugin } from '@glimmer/syntax';

export default function transformAngleBracketComponents(/* env */): ASTPlugin {
  return {
    name: 'transform-angle-bracket-components',

    visitor: {
      ComponentNode(node: any): void {
        node.tag = `<${node.tag}>`;
      },
    },
  } as any;
}
