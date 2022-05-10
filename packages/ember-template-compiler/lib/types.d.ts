import type {
  ASTPluginBuilder,
  ASTPluginEnvironment,
  builders,
  PrecompileOptions,
} from '@glimmer/syntax';

export type Builders = typeof builders;

/*
 * It seems like it should be possible to reepxport the `ASTPluginBuilder`
 * interface with a new named export, but the I wasn't able to figure out the
 * typing. Here export the interface subclass with no modification.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
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
