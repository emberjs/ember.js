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
          if (env.meta?.jsutils) {
            node.path.original = env.meta.jsutils.bindImport('@ember/modifier', 'on', node, {
              name: 'on',
            });
          }
          // At runtime, keywords are handled by lexicalScope + the evaluator
          // in template.ts, so no AST rewriting is needed here.
        }
      },
    },
  };
}

function isOn(
  node: AST.ElementModifierStatement | AST.MustacheStatement | AST.SubExpression,
  hasLocal: (k: string) => boolean
): node is AST.ElementModifierStatement & { path: AST.PathExpression } {
  return isPath(node.path) && node.path.original === 'on' && !hasLocal('on');
}
