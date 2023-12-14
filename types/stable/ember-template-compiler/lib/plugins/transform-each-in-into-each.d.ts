declare module 'ember-template-compiler/lib/plugins/transform-each-in-into-each' {
  import type { ASTPlugin } from '@glimmer/syntax';
  import type { EmberASTPluginEnvironment } from 'ember-template-compiler/lib/types';
  /**
     @module ember
    */
  /**
      A Glimmer2 AST transformation that replaces all instances of

      ```handlebars
      {{#each-in iterableThing as |key value|}}
      ```

      with

      ```handlebars
      {{#each (-each-in iterableThing) as |value key|}}
      ```

      @private
      @class TransformHasBlockSyntax
    */
  export default function transformEachInIntoEach(env: EmberASTPluginEnvironment): ASTPlugin;
}
