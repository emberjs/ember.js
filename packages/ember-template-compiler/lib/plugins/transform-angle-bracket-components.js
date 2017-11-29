export default function transformAngleBracketComponents(env) {
  return {
    name: 'transform-angle-bracket-components',

    visitor: {
      ComponentNode(node) {
        node.tag = `<${node.tag}>`;
      }
    }
  };
}
