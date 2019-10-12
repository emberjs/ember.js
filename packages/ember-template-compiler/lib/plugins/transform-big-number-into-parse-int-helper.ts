import { AST, ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';

/**
 @module ember
*/

/**
  A Glimmer2 AST transformation that replaces all instances of

  ```handlebars
 {{foo 12345566788}}
  ```

  to

  ```handlebars
 {{foo (-parse-int "12345566788")}}
  ```

  @private
  @class TransformBigNumberIntoParseIntHelper
*/

export default function transformBigNumberIntoParseIntHelper(env: ASTPluginEnvironment): ASTPlugin {
  let { builders: b } = env.syntax;

  return {
    name: 'transform-big-number-into-parse-int-helper',

    visitor: {

      NumberLiteral(number: AST.NumberLiteral): AST.Node {
        //See https://github.com/emberjs/ember.js/issues/15635 for the choice for [9].
        if(String(number.original).length > 9) {

          let params: AST.Expression[] = [];
          params.push(b.string(String(number.value));

          return b.sexpr(
            '-parse-int',
            params,
            undefined,
            undefined,
            number.loc
          );
        }
        return number;
      }
    },
  };
}
