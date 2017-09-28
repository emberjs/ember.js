const PRAGMA_TAG = 'use-component-manager';

export default function extractPragmaTag(env) {
  let { meta } = env;

  return {
    name: 'extract-pragma-tag',

    visitors: {
      MustacheStatement: {
        enter(node) {
          if (node.path.type === 'PathExpression' && node.path.original === PRAGMA_TAG) {
            meta.managerId = node.params[0].value;
            return null;
          }
        }
      }
    }
  };
}
