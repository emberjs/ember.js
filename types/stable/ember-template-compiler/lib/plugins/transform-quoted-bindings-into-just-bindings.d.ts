declare module 'ember-template-compiler/lib/plugins/transform-quoted-bindings-into-just-bindings' {
  import type { ASTPlugin } from '@glimmer/syntax';
  export default function transformQuotedBindingsIntoJustBindings(): ASTPlugin;
}
