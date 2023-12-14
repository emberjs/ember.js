declare module 'ember-template-compiler/lib/plugins/assert-reserved-named-arguments' {
  import type { ASTPlugin } from '@glimmer/syntax';
  import type { EmberASTPluginEnvironment } from 'ember-template-compiler/lib/types';
  export default function assertReservedNamedArguments(env: EmberASTPluginEnvironment): ASTPlugin;
}
