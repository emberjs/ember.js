declare module '@ember/template-compilation' {
  import type { TemplateFactory } from '@glimmer/interfaces';
  import type * as ETC from 'ember-template-compiler';
  interface CommonOptions {
    moduleName?: string;
  }
  interface LooseModeOptions extends CommonOptions {
    strictMode?: false;
  }
  interface StrictModeOptions extends CommonOptions {
    strictMode: true;
    scope: () => Record<string, unknown>;
  }
  interface PrecompileTemplate {
    (templateString: string, options?: LooseModeOptions): TemplateFactory;
    (templateString: string, options: StrictModeOptions): TemplateFactory;
  }
  export let __emberTemplateCompiler: undefined | typeof ETC;
  export const compileTemplate: typeof ETC.compile;
  export let precompileTemplate: PrecompileTemplate;
  export function __registerTemplateCompiler(c: typeof ETC): void;
  export {};
}
