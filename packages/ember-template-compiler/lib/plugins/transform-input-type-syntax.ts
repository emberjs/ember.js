import { AST, ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';
import { Builders } from '../types';

/**
 @module ember
*/

/**
  A Glimmer2 AST transformation that replaces all instances of

  ```handlebars
 {{input type=boundType}}
  ```

  with

  ```handlebars
 {{input (-input-type boundType) type=boundType}}
  ```

  Note that the type parameters is not removed as the -input-type helpers
  is only used to select the component class. The component still needs
  the type parameter to function.

  @private
  @class TransformInputTypeSyntax
*/

export default function transformInputTypeSyntax(env: ASTPluginEnvironment): ASTPlugin {
  let b = env.syntax.builders;

  return {
    name: 'transform-input-type-syntax',

    visitor: {
      MustacheStatement(node: AST.MustacheStatement) {
        if (isInput(node)) {
          insertTypeHelperParameter(node, b);
        }
      },
    },
  };
}

function isInput(node: AST.MustacheStatement) {
  return node.path.original === 'input';
}

function insertTypeHelperParameter(node: AST.MustacheStatement, builders: Builders) {
  let pairs = node.hash.pairs;
  let pair = null;
  for (let i = 0; i < pairs.length; i++) {
    if (pairs[i].key === 'type') {
      pair = pairs[i];
      break;
    }
  }
  if (pair && pair.value.type !== 'StringLiteral') {
    node.params.unshift(builders.sexpr('-input-type', [pair.value], undefined, pair.loc));
  }
}
