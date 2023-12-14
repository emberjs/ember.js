declare module 'ember-template-compiler/lib/plugins/transform-resolutions' {
  import type { ASTPlugin } from '@glimmer/syntax';
  import type { EmberASTPluginEnvironment } from 'ember-template-compiler/lib/types';
  export default function transformResolutions(env: EmberASTPluginEnvironment): ASTPlugin;
}
