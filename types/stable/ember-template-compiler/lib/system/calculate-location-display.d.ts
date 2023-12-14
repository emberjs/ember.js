declare module 'ember-template-compiler/lib/system/calculate-location-display' {
  import type { AST } from '@glimmer/syntax';
  export default function calculateLocationDisplay(
    moduleName: string | undefined,
    loc?: AST.SourceLocation | undefined
  ): string;
}
