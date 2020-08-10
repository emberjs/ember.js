import { ASTPlugin, ASTPluginEnvironment, builders } from '@glimmer/syntax';
import { StaticTemplateMeta } from '@ember/-internals/views';

export type Builders = typeof builders;

export interface PluginFunc {
  (env: EmberASTPluginEnvironment): ASTPlugin;
  __raw?: LegacyPluginClass;
}

interface Plugins {
  ast: PluginFunc[];
}

export interface CompileOptions {
  meta?: any;
  contents?: string;
  moduleName?: string;
  plugins?: Plugins;
}

export interface EmberPrecompileOptions {
  customizeComponentName(tag: string): string;
  contents?: string;
  moduleName?: string;
  plugins: Plugins;
  meta: StaticTemplateMeta;
}

export type EmberASTPluginEnvironment = ASTPluginEnvironment & EmberPrecompileOptions;
