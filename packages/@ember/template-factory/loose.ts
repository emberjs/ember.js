import type { TemplateFactory } from '@glimmer/interfaces';
import { ensureBuiltins } from '@ember/-internals/glimmer/lib/builtins';
import modularTemplateFactory, {
  type SerializedTemplateWithOps,
} from '@glimmer/opcode-compiler/lib/template-core';

/**
 * The template factory for loose mode templates whose opcodes are
 * imported. Loose mode resolves helpers and modifiers by name, so the
 * built-in tables must be filled.
 */
export function createTemplateFactory(serialized: SerializedTemplateWithOps): TemplateFactory {
  ensureBuiltins();
  return modularTemplateFactory(serialized);
}
