declare module 'ember-template-compiler/lib/types' {
  import type {
    ASTPluginBuilder,
    ASTPluginEnvironment,
    builders,
    PrecompileOptions,
  } from '@glimmer/syntax';
  export type Builders = typeof builders;
  export interface PluginFunc extends ASTPluginBuilder<EmberASTPluginEnvironment> {}
  interface Plugins {
    ast: PluginFunc[];
  }
  export interface EmberPrecompileOptions extends PrecompileOptions {
    isProduction?: boolean;
    moduleName?: string;
    plugins?: Plugins;
  }
  export type EmberASTPluginEnvironment = ASTPluginEnvironment & EmberPrecompileOptions;
  export {};
}
