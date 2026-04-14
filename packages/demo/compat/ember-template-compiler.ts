/**
 * GXT-compatible ember-template-compiler replacement
 *
 * This module provides runtime template compilation that produces
 * gxt-compatible templates with $nodes structure.
 * Delegates to compile.ts which uses the GXT runtime compiler.
 */

// GXT compile options type
export interface EmberPrecompileOptions {
  moduleName?: string;
  strictMode?: boolean;
  locals?: string[];
  isProduction?: boolean;
  meta?: Record<string, unknown>;
  plugins?: {
    ast?: any[];
  };
  parseOptions?: {
    srcName?: string;
    ignoreStandalone?: boolean;
  };
  customizeComponentName?: (name: string) => string;
}

/**
 * Compile a template string to a gxt-compatible template factory.
 * Delegates to compile.ts which uses the GXT runtime compiler for proper
 * component invocation (e.g., <XBlah /> -> $_c('x-blah', ...)).
 */
import { compileTemplate } from './compile';
export const compile = compileTemplate;

/**
 * Precompile a template string (returns serialized form)
 */
export function precompile(
  templateString: string,
  options: Partial<EmberPrecompileOptions> = {}
): string {
  // For gxt, we return a marker that indicates this needs runtime compilation
  return JSON.stringify({
    __gxtTemplate: true,
    source: templateString,
    moduleName: options.moduleName,
  });
}

// Re-export compileOptions for compatibility
export function compileOptions(options: Partial<EmberPrecompileOptions> = {}) {
  return options;
}

export function buildCompileOptions(options: any) {
  return options;
}

export function transformsFor() {
  return [];
}

// Export VERSION for compatibility
export const VERSION = '5.0.0-gxt';

// Minimal GlimmerSyntax placeholder (no-op implementations)
export const _GlimmerSyntax = {
  preprocess(_template: string) {
    return { body: [] };
  },
  traverse() {},
  print(_ast: any) {
    return '';
  },
};

export const _preprocess = _GlimmerSyntax.preprocess;
export const _print = _GlimmerSyntax.print;
export const _precompile = precompile;

// Default export
export default { compile, precompile, VERSION };
