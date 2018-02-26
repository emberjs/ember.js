export default function transformAngleBracketComponents(env) {
  return {
    name: 'transform-angle-bracket-components',

    visitors: {
      ComponentNode(node) {
        node.tag = `<${node.tag}>`;
      }
    }
  };
}
