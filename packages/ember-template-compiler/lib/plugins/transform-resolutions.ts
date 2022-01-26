import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { AST, ASTPlugin, print } from '@glimmer/syntax';
import calculateLocationDisplay from '../system/calculate-location-display';
import { EmberASTPluginEnvironment } from '../types';
import { isPath, isStringLiteral, trackLocals } from './utils';

/**
 @module ember
*/

/**
  A Glimmer2 AST transformation that replaces all instances of

  ```handlebars
  {{helper "..." ...}}
  ```

  with

  ```handlebars
  {{helper (-resolve "helper:...") ...}}
  ```

  and

  ```handlebars
  {{helper ... ...}}
  ```

  with

  ```handlebars
  {{helper (-disallow-dynamic-resolution ...) ...}}
  ```

  and

  ```handlebars
  {{modifier "..." ...}}
  ```

  with

  ```handlebars
  {{modifier (-resolve "modifier:...") ...}}
  ```
  and

  ```handlebars
  {{modifier ... ...}}
  ```

  with

  ```handlebars
  {{modifier (-disallow-dynamic-resolution ...) ...}}
  ```

  @private
  @class TransformResolutions
*/

const TARGETS = Object.freeze(['helper', 'modifier']);

export default function transformResolutions(env: EmberASTPluginEnvironment): ASTPlugin {
  let { builders: b } = env.syntax;
  let moduleName = env.meta?.moduleName;
  let { hasLocal, node: tracker } = trackLocals();
  let seen: Set<AST.Node> | undefined;

  return {
    name: 'transform-resolutions',

    visitor: {
      Template: {
        enter() {
          seen = new Set();
        },

        exit() {
          seen = undefined;
        },
      },

      Block: tracker,

      ElementNode: {
        keys: {
          children: tracker,
        },
      },

      MustacheStatement(node: AST.MustacheStatement): AST.Node | void {
        assert('[BUG] seen set should be available', seen);

        if (seen.has(node)) {
          return;
        }

        if (
          isPath(node.path) &&
          !isLocalVariable(node.path, hasLocal) &&
          TARGETS.indexOf(node.path.original) !== -1
        ) {
          let result = b.mustache(
            node.path,
            transformParams(b, node.params, node.path.original, moduleName, node.loc),
            node.hash,
            node.trusting,
            node.loc,
            node.strip
          );

          // Avoid double/infinite-processing
          seen.add(result);

          return result;
        }
      },
      SubExpression(node: AST.SubExpression): AST.Node | void {
        assert('[BUG] seen set should be available', seen);

        if (seen.has(node)) {
          return;
        }

        if (
          isPath(node.path) &&
          !isLocalVariable(node.path, hasLocal) &&
          TARGETS.indexOf(node.path.original) !== -1
        ) {
          let result = b.sexpr(
            node.path,
            transformParams(b, node.params, node.path.original, moduleName, node.loc),
            node.hash,
            node.loc
          );

          // Avoid double/infinite-processing
          seen.add(result);

          return result;
        }
      },
    },
  };
}

function isLocalVariable(node: AST.PathExpression, hasLocal: (k: string) => boolean): boolean {
  return !node.this && node.parts.length === 1 && hasLocal(node.parts[0]!);
}

function transformParams(
  b: EmberASTPluginEnvironment['syntax']['builders'],
  params: AST.Expression[],
  type: string,
  moduleName: string | undefined,
  loc: AST.SourceLocation | undefined
): AST.Expression[] {
  let [first, ...rest] = params;

  assert(
    `The ${type} keyword requires at least one positional arguments ${calculateLocationDisplay(
      moduleName,
      loc
    )}`,
    first
  );

  if (isStringLiteral(first)) {
    return [
      b.sexpr(
        b.path('-resolve', first.loc),
        [b.string(`${type}:${first.value}`)],
        undefined,
        first.loc
      ),
      ...rest,
    ];
  } else if (DEBUG) {
    return [
      b.sexpr(
        b.path('-disallow-dynamic-resolution', first.loc),
        [first],
        b.hash([
          b.pair('type', b.string(type), first.loc),
          b.pair('loc', b.string(calculateLocationDisplay(moduleName, loc)), first.loc),
          b.pair('original', b.string(print(first))),
        ]),
        first.loc
      ),
      ...rest,
    ];
  } else {
    return params;
  }
}
