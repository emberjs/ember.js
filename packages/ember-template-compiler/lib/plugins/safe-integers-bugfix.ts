import { AST, ASTPlugin, ASTPluginEnvironment } from '@glimmer/syntax';
import { MustacheStatement, NumberLiteral } from '@glimmer/syntax/dist/types/lib/types/nodes';

/**
 @module ember
*/

/**
  A Glimmer2 AST transformation that replaces all instances of

  ```handlebars
 {{987654321}}
  ```

  to

  ```handlebars
 {{-i "987654321"}}
  ```

  as well as other integer number literals in sexp arguments, etc.

  The version of Glimmer VM we are using has a bug that encodes
  certain integers incorrectly. This forces them into strings and
  use `{{-i}}` (which is a wrapper around `parseInt`) to decode
  them manually as a workaround.

  This should be removed when the Glimmer VM bug is fixed.

  @private
  @class SafeIntegersBugfix
*/

export default function safeIntegersBugfix(env: ASTPluginEnvironment): ASTPlugin {
  let { builders: b } = env.syntax;

  return {
    name: 'safe-integers-bugfix',

    visitor: {
      MustacheStatement(node: AST.MustacheStatement): AST.MustacheStatement | undefined {
        if (!requiresWorkaround(node)) {
          return;
        }

        return b.mustache(
          '-i',
          [b.string(String(node.path.value))],
          undefined,
          !node.escaped,
          node.loc
        );
      },

      NumberLiteral(node: AST.NumberLiteral): AST.SubExpression | undefined {
        if (!requiresWorkaround(node)) {
          return;
        }

        return b.sexpr('-i', [b.string(String(node.value))], undefined, node.loc);
      },
    },
  };
}

type NumberLiteralMustacheStatement = MustacheStatement & { path: NumberLiteral };

function requiresWorkaround(node: AST.MustacheStatement): node is NumberLiteralMustacheStatement;
function requiresWorkaround(node: AST.NumberLiteral): boolean;
function requiresWorkaround(node: AST.MustacheStatement | AST.NumberLiteral): boolean {
  if (node.type === 'MustacheStatement' && node.path.type === 'NumberLiteral') {
    return requiresWorkaround(node.path);
  } else if (node.type === 'NumberLiteral') {
    return isInteger(node.value) && isOverflowing(node.value);
  } else {
    return false;
  }
}

// Number.isInteger polyfill
function isInteger(value: number): boolean {
  return isFinite(value) && Math.floor(value) === value;
}

function isOverflowing(value: number): boolean {
  return value >= 2 ** 28;
}
