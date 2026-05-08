import { type AST, type ASTPlugin, isPrivateFieldSegment, privateFieldName } from '@glimmer/syntax';
import type { EmberASTPluginEnvironment } from '../types';

/**
 * Walks the template AST and records every private-field segment it sees in
 * a `{{this.#field}}`-style path into `env.meta.privateFields`. The host
 * (`template()`) wires up the bag, then uses the collected names to build
 * one runtime accessor per class via the user's `eval` and registers it
 * with `setPrivateFieldReader`. The plugin itself does **not** rewrite the
 * AST — `_getProp` handles the `#`-prefixed key at property-walk time.
 */
export default function collectPrivateFields(env: EmberASTPluginEnvironment): ASTPlugin {
  let collected = env.meta?.privateFields;

  if (!collected) {
    return { name: 'collect-private-fields', visitor: {} };
  }

  return {
    name: 'collect-private-fields',
    visitor: {
      PathExpression(node: AST.PathExpression) {
        for (let segment of node.tail) {
          if (isPrivateFieldSegment(segment)) {
            collected!.add(privateFieldName(segment));
          }
        }
      },
    },
  };
}
