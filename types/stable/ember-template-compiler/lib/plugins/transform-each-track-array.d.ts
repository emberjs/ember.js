declare module 'ember-template-compiler/lib/plugins/transform-each-track-array' {
  import type { ASTPlugin } from '@glimmer/syntax';
  import type { EmberASTPluginEnvironment } from 'ember-template-compiler/lib/types';
  /**
     @module ember
    */
  /**
      A Glimmer2 AST transformation that replaces all instances of

      ```handlebars
      {{#each iterableThing as |key value|}}
      ```

      with

      ```handlebars
      {{#each (-track-array iterableThing) as |key value|}}
      ```

      @private
      @class TransformHasBlockSyntax
    */
  export default function transformEachTrackArray(env: EmberASTPluginEnvironment): ASTPlugin;
}
