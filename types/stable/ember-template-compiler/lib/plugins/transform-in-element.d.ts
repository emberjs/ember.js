declare module 'ember-template-compiler/lib/plugins/transform-in-element' {
  import type { ASTPlugin } from '@glimmer/syntax';
  import type { EmberASTPluginEnvironment } from 'ember-template-compiler/lib/types';
  /**
     @module ember
    */
  /**
      A Glimmer2 AST transformation that handles the public `{{in-element}}` as per RFC287.

      Issues a build time assertion for:

      ```handlebars
      {{#in-element someElement insertBefore="some-none-null-value"}}
        {{modal-display text=text}}
      {{/in-element}}
      ```

      @private
      @class TransformInElement
    */
  export default function transformInElement(env: EmberASTPluginEnvironment): ASTPlugin;
}
