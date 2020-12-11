import { ASTPlugin, ASTPluginEnvironment, builders, PrecompileOptions } from '@glimmer/syntax';
import { StaticTemplateMeta } from '@ember/-internals/views';

export type Builders = typeof builders;

export interface PluginFunc {
  (env: EmberASTPluginEnvironment): ASTPlugin;
  __raw?: LegacyPluginClass;
}

interface Plugins {
  ast: PluginFunc[];
}

export interface EmberPrecompileOptions extends PrecompileOptions {
  strictMode?: boolean;
  locals?: string[];
  customizeComponentName(tag: string): string;
  isProduction: boolean;
  contents?: string;
  moduleName?: string;
  plugins: Plugins;
  meta: StaticTemplateMeta;
}

export type EmberASTPluginEnvironment = ASTPluginEnvironment & EmberPrecompileOptions;
