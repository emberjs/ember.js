declare module 'ember-template-compiler/lib/plugins/assert-splattribute-expression' {
  import type { ASTPlugin } from '@glimmer/syntax';
  import type { EmberASTPluginEnvironment } from 'ember-template-compiler/lib/types';
  export default function assertSplattributeExpressions(env: EmberASTPluginEnvironment): ASTPlugin;
}
