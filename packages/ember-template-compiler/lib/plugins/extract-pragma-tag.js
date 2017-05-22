const PRAGMA_TAG = 'use-component-manager';

// Custom Glimmer AST transform to extract custom component
// manager id from the template
export default class ExtractPragmaPlugin {
  constructor(options) {
    this.options = options;
  }

  transform(ast) {
    let options = this.options;

    this.syntax.traverse(ast, {
      MustacheStatement: {
        enter(node) {
          if (node.path.type === 'PathExpression' && node.path.original === PRAGMA_TAG) {
            options.meta.managerId = node.params[0].value;
            return null;
          }
        }
      }
    });

    return ast;
  }
}
