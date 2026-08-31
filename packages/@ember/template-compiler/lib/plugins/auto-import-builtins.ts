import type * as AST from '@glimmer/syntax/lib/v1/api';
import type { ASTPlugin } from '@glimmer/syntax/lib/parser/tokenizer-event-handlers';
import type { EmberASTPluginEnvironment } from '../types';
import { bindKeyword, KEYWORDS_MODULE, trackLocals } from './utils';

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
  'mut',
  'readonly',
  'unbound',
]);

const importSource: Record<string, string> = {
  on: '@ember/modifier',
  mut: KEYWORDS_MODULE,
  readonly: KEYWORDS_MODULE,
  unbound: KEYWORDS_MODULE,
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

        bindKeyword(env, node, node.original, importSource[node.original] || '@ember/helper');
      },
    },
  };
}
