import type * as AST from '@glimmer/syntax/lib/v1/api';
import type { ASTPlugin } from '@glimmer/syntax/lib/parser/tokenizer-event-handlers';
import type { EmberASTPluginEnvironment } from '../types';
import { trackLocals } from './utils';

/**
 @module ember
*/

const keywordNames = new Set([
  'array',
  'eq',
  'element',
  'and',
  'fn',
  'hash',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'not',
  'on',
  'or',
]);

const importSource: Record<string, string> = {
  on: '@ember/modifier',
};

/**
  A Glimmer2 AST transformation that makes importable keywords work

  @private
  @class TransformActionSyntax
*/

export default function autoImportBuiltins(env: EmberASTPluginEnvironment): ASTPlugin {
  let { hasLocal, visitor } = trackLocals(env);

  return {
    name: 'auto-import-built-ins',

    visitor: {
      ...visitor,
      PathExpression(node: AST.PathExpression) {
        if (!keywordNames.has(node.original)) return;
        if (hasLocal(node.original)) return;

        rewriteKeyword(env, node, node.original, importSource[node.original] || '@ember/helper');
      },
    },
  };
}

function rewriteKeyword(
  env: EmberASTPluginEnvironment,
  node: AST.PathExpression,
  name: string,
  moduleSpecifier: string
) {
  if (env.meta?.jsutils) {
    node.original = env.meta.jsutils.bindImport(moduleSpecifier, name, node, {
      name,
    });
  } else if (env.meta?.emberRuntime) {
    node.original = env.meta.emberRuntime.lookupKeyword(name);
  }
}
