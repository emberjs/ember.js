declare module 'ember-template-compiler/lib/plugins/transform-wrap-mount-and-outlet' {
  import type { ASTPlugin } from '@glimmer/syntax';
  import type { EmberASTPluginEnvironment } from 'ember-template-compiler/lib/types';
  /**
     @module ember
    */
  /**
      A Glimmer2 AST transformation that replaces all instances of

      ```handlebars
      {{mount "engine" model=this.model}}
      ```

      with

      ```handlebars
      {{component (-mount "engine" model=this.model)}}
      ```

      and

      ```handlebars
      {{outlet}}
      ```

      with

      ```handlebars
      {{component (-outlet)}}
      ```

      @private
      @class TransformHasBlockSyntax
    */
  export default function transformWrapMountAndOutlet(env: EmberASTPluginEnvironment): ASTPlugin;
}
