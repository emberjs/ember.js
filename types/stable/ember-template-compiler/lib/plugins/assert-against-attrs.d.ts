declare module 'ember-template-compiler/lib/plugins/assert-against-attrs' {
  import type { ASTPlugin } from '@glimmer/syntax';
  import type { EmberASTPluginEnvironment } from 'ember-template-compiler/lib/types';
  /**
     @module ember
    */
  /**
      A Glimmer2 AST transformation that asserts against

      ```handlebars
      {{attrs.foo.bar}}
      ```

      ...as well as `{{#if attrs.foo}}`, `{{deeply (nested attrs.foobar.baz)}}`.

      @private
      @class AssertAgainstAttrs
    */
  export default function assertAgainstAttrs(env: EmberASTPluginEnvironment): ASTPlugin;
}
