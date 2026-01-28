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
          // @ts-expect-error may not exist in all environments (the deprecated runtime compiler, for example)
          env.meta?.jsutils?.bindImport?.('@ember/modifier', 'on', node, { name: 'on' });
        }
      },
    },
  };
}

function isOn(
  node: AST.ElementModifierStatement | AST.MustacheStatement | AST.SubExpression,
  hasLocal: (k: string) => boolean
) {
  return isPath(node.path) && node.path.original === 'on' && !hasLocal('on');
}
