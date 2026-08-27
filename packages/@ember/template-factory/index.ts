import type { TemplateFactory } from '@glimmer/interfaces';
import { ensureBuiltins } from '@ember/-internals/glimmer/lib/builtins';
import legacyTemplateFactory from '@glimmer/opcode-compiler/lib/template';

/**
 * The template factory for JSON blocks. Such a block can be a loose mode
 * template, so the built-in helpers must be resolvable by name.
 */
export function createTemplateFactory(
  serialized: Parameters<typeof legacyTemplateFactory>[0]
): TemplateFactory {
  ensureBuiltins();
  return legacyTemplateFactory(serialized);
}
