/**
 @module ember
*/

/**
  A Glimmer2 AST transformation that replaces all instances of

  ```handlebars
 {{#each-in iterableThing as |key value|}}
  ```

  with

  ```handlebars
 {{#each (-each-in iterableThing) as |key value|}}
  ```

  @private
  @class TransformHasBlockSyntax
*/
export default function transformEachInIntoEach(env) {
  let { builders: b } = env.syntax;

  return {
    name: 'transform-each-in-into-each',

    visitors: {
      BlockStatement(node) {
        if (node.path.original === 'each-in') {
          node.params[0] = b.sexpr(b.path('-each-in'), [node.params[0]]);
          return b.block(b.path('each'), node.params, node.hash, node.program, node.inverse, node.loc);
        }
      }
    }
  };
}
