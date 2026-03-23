import type { AST, ASTPlugin } from '@glimmer/syntax';
import type { EmberASTPluginEnvironment } from '../types';
import { isPath, trackLocals } from './utils';

/**
 @module ember
*/

/**
  A Glimmer2 AST transformation that makes importable keywords work

  @private
  @class AutoImportBuiltins
*/

const MODIFIER_KEYWORDS: Record<string, string> = {
  on: '@ember/modifier',
};

const HELPER_KEYWORDS: Record<string, string> = {
  fn: '@ember/helper',
  hash: '@ember/helper',
  array: '@ember/helper',
  and: '@ember/helper',
  or: '@ember/helper',
  not: '@ember/helper',
  eq: '@ember/helper',
  neq: '@ember/helper',
  lt: '@ember/helper',
  lte: '@ember/helper',
  gt: '@ember/helper',
  gte: '@ember/helper',
};

export default function autoImportBuiltins(env: EmberASTPluginEnvironment): ASTPlugin {
  let { hasLocal, visitor } = trackLocals(env);

  function rewrite(
    node: AST.ElementModifierStatement | AST.MustacheStatement | AST.SubExpression,
    modulePath: string,
    name: string
  ) {
    if (env.meta?.jsutils) {
      (node.path as AST.PathExpression).original = env.meta.jsutils.bindImport(
        modulePath,
        name,
        node,
        { name }
      );
    } else if (env.meta?.emberRuntime) {
      (node.path as AST.PathExpression).original = env.meta.emberRuntime.lookupKeyword(name);
    }
  }

  return {
    name: 'auto-import-built-ins',

    visitor: {
      ...visitor,
      ElementModifierStatement(node: AST.ElementModifierStatement) {
        if (!isPath(node.path) || hasLocal(node.path.original)) return;
        let modulePath = MODIFIER_KEYWORDS[node.path.original];
        if (modulePath) {
          rewrite(node, modulePath, node.path.original);
        }
      },
      MustacheStatement(node: AST.MustacheStatement) {
        if (!isPath(node.path) || hasLocal(node.path.original)) return;
        let modulePath = HELPER_KEYWORDS[node.path.original];
        if (modulePath) {
          rewrite(node, modulePath, node.path.original);
        }
      },
      SubExpression(node: AST.SubExpression) {
        if (!isPath(node.path) || hasLocal(node.path.original)) return;
        let modulePath = HELPER_KEYWORDS[node.path.original];
        if (modulePath) {
          rewrite(node, modulePath, node.path.original);
        }
      },
    },
  };
}
