import {
  ASTPluginBuilder,
  ASTPluginEnvironment,
  builders,
  PrecompileOptions,
} from '@glimmer/syntax';
import { LegacyPluginClass } from './system/compile-options';

export type Builders = typeof builders;

export interface PluginFunc extends ASTPluginBuilder<EmberASTPluginEnvironment> {
  __raw?: LegacyPluginClass;
}

interface Plugins {
  ast: PluginFunc[];
}

export interface EmberPrecompileOptions extends PrecompileOptions {
  isProduction?: boolean;
  moduleName?: string;
  plugins?: Plugins;
}

export type EmberASTPluginEnvironment = ASTPluginEnvironment & EmberPrecompileOptions;
