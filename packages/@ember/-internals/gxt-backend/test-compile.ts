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
export default function compile(
  templateSource: string,
  options: Record<string, any> = {},
  _scopeValues: Record<string, unknown> = {}
): TemplateFactory {
  // Use gxt compile instead of glimmer-vm compile
  return gxtCompile(templateSource, {
    moduleName: options.moduleName ?? options.meta?.moduleName ?? '(unknown template module)',
    strictMode: options.strictMode ?? false,
    ...options,
  });
}

export { compile };
