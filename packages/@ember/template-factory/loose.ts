import type { TemplateFactory } from '@glimmer/interfaces';
import { ensureResolver } from '@ember/-internals/glimmer/lib/builtins';
import type { SerializedTemplateWithOps } from '@glimmer/opcode-compiler/lib/template-core';
import modularTemplateFactory from '@glimmer/opcode-compiler/lib/template-jit';

/**
 * The template factory for loose mode templates whose opcodes are
 * imported. The build binds the built-ins, so only user helpers and
 * components resolve by name, through the renderer's resolver.
 */
export function createTemplateFactory(serialized: SerializedTemplateWithOps): TemplateFactory {
  // Only user helpers and components resolve by name; the build binds the
  // built-ins. The classic resolver serves those lookups.
  ensureResolver();
  return modularTemplateFactory(serialized);
}
