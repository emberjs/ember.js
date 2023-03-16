/**
 * References:
 *  - https://github.com/emberjs/rfcs/pull/496
 *  - https://github.com/emberjs/rfcs/pull/779
 */
declare module '@ember/template-compilation' {
  import type { TemplateFactory } from '@ember/component/-private/glimmer-interfaces';

  interface MaybeModuleName {
    moduleName?: string;
  }

  interface LooseMode extends MaybeModuleName {
    strictMode?: false;
  }

  interface StrictMode extends MaybeModuleName {
    strictMode: true;
    scope: () => Record<string, unknown>;
  }

  type PrecompileTemplateOptions = LooseMode | StrictMode;

  export function precompileTemplate(
    template: string,
    options?: PrecompileTemplateOptions
  ): TemplateFactory;
}
