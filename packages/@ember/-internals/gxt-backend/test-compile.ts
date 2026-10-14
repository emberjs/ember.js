/**
 * GXT-compatible test compile replacement
 *
 * This module replaces internal-test-helpers/lib/compile to use gxt compilation
 */

import { compile as gxtCompile } from './ember-template-compiler';
import type { TemplateFactory } from '@glimmer/interfaces';

/**
 * Uses GXT compile function to process a string into a compiled template.
 *
 * @private
 * @method compile
 * @param {String} templateSource This is the string to be compiled by GXT.
 * @param {Object} options This is an options hash to augment the compiler options.
 */
export default function compileWithScope(
  templateSource: string,
  options: Record<string, any> = {},
  _scopeValues: Record<string, unknown> = {}
): TemplateFactory {
  // Use gxt compile instead of glimmer-vm compile. The options reach it as the
  // classic harness passes them to `precompileJSON`: without a module name,
  // compile errors name 'an unknown module', as Glimmer's do.
  return gxtCompile(templateSource, {
    strictMode: options.strictMode ?? false,
    ...options,
    scopeValues: Object.keys(_scopeValues).length > 0 ? _scopeValues : undefined,
  });
}

/**
 * The named `compile` of internal-test-helpers/lib/compile, in the shape of the
 * conformance adapter's `compile`: `scope` is a thunk returning the lexical
 * scope of a strict-mode template, `plugins` are AST plugins (passed to the gxt
 * pipeline as `plugins.ast`).
 */
export function compile(
  source: string,
  options: {
    strictMode?: boolean | undefined;
    scope?: (() => Record<string, unknown>) | undefined;
    moduleName?: string | undefined;
    plugins?: unknown[] | undefined;
  } = {}
): TemplateFactory {
  let { strictMode, scope, moduleName, plugins } = options;
  let precompile: Record<string, any> = {};

  if (strictMode !== undefined) precompile['strictMode'] = strictMode;
  if (moduleName !== undefined) precompile['moduleName'] = moduleName;
  if (plugins !== undefined) precompile['plugins'] = { ast: plugins };

  return compileWithScope(source, precompile, scope?.() ?? {});
}
