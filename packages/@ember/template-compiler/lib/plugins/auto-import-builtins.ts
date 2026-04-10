import type { AST, ASTPlugin } from '@glimmer/syntax';
import type { EmberASTPluginEnvironment } from '../types';
import { isPath, trackLocals } from './utils';

/**
 @module ember
*/

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
      ElementModifierStatement(node: AST.ElementModifierStatement) {
        if (isOn(node, hasLocal)) {
          rewriteKeyword(env, node, 'on', '@ember/modifier');
        }
      },
      SubExpression(node: AST.SubExpression) {
        if (isArray(node, hasLocal)) {
          rewriteKeyword(env, node, 'array', '@ember/helper');
        }
        if (isElement(node, hasLocal)) {
          rewriteKeyword(env, node, 'element', '@ember/helper');
        }
        if (isFn(node, hasLocal)) {
          rewriteKeyword(env, node, 'fn', '@ember/helper');
        }
        if (isHash(node, hasLocal)) {
          rewriteKeyword(env, node, 'hash', '@ember/helper');
        }
      },
      MustacheStatement(node: AST.MustacheStatement) {
        if (isArray(node, hasLocal)) {
          rewriteKeyword(env, node, 'array', '@ember/helper');
        }
        if (isElement(node, hasLocal)) {
          rewriteKeyword(env, node, 'element', '@ember/helper');
        }
        if (isFn(node, hasLocal)) {
          rewriteKeyword(env, node, 'fn', '@ember/helper');
        }
        if (isHash(node, hasLocal)) {
          rewriteKeyword(env, node, 'hash', '@ember/helper');
        }
      },
    },
  };
}

function rewriteKeyword(
  env: EmberASTPluginEnvironment,
  node: { path: AST.PathExpression },
  name: string,
  moduleSpecifier: string
) {
  if (env.meta?.jsutils) {
    node.path.original = env.meta.jsutils.bindImport(moduleSpecifier, name, node, {
      name,
    });
  } else if (env.meta?.emberRuntime) {
    node.path.original = env.meta.emberRuntime.lookupKeyword(name);
  }
}

function isOn(
  node: AST.ElementModifierStatement | AST.MustacheStatement | AST.SubExpression,
  hasLocal: (k: string) => boolean
): node is AST.ElementModifierStatement & { path: AST.PathExpression } {
  return isPath(node.path) && node.path.original === 'on' && !hasLocal('on');
}

function isArray(
  node: AST.MustacheStatement | AST.SubExpression,
  hasLocal: (k: string) => boolean
): node is (AST.MustacheStatement | AST.SubExpression) & { path: AST.PathExpression } {
  return isPath(node.path) && node.path.original === 'array' && !hasLocal('array');
}

function isFn(
  node: AST.MustacheStatement | AST.SubExpression,
  hasLocal: (k: string) => boolean
): node is (AST.MustacheStatement | AST.SubExpression) & { path: AST.PathExpression } {
  return isPath(node.path) && node.path.original === 'fn' && !hasLocal('fn');
}

function isHash(
  node: AST.MustacheStatement | AST.SubExpression,
  hasLocal: (k: string) => boolean
): node is (AST.MustacheStatement | AST.SubExpression) & { path: AST.PathExpression } {
  return isPath(node.path) && node.path.original === 'hash' && !hasLocal('hash');
}

function isElement(
  node: AST.MustacheStatement | AST.SubExpression,
  hasLocal: (k: string) => boolean
): node is (AST.MustacheStatement | AST.SubExpression) & { path: AST.PathExpression } {
  return isPath(node.path) && node.path.original === 'element' && !hasLocal('element');
}
