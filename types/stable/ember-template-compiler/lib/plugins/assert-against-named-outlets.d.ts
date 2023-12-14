declare module 'ember-template-compiler/lib/plugins/assert-against-named-outlets' {
  import type { ASTPlugin } from '@glimmer/syntax';
  import type { EmberASTPluginEnvironment } from 'ember-template-compiler/lib/types';
  /**
     @module ember
    */
  /**
      Prevents usage of named outlets, a legacy concept in Ember removed in 4.0.

      @private
      @class AssertAgainstNamedOutlets
    */
  export default function assertAgainstNamedOutlets(env: EmberASTPluginEnvironment): ASTPlugin;
}
