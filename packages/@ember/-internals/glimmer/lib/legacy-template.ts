import type { TemplateFactory } from '@glimmer/interfaces';
import legacyTemplateFactory from '@glimmer/opcode-compiler/lib/template';
import { ensureBuiltins } from './builtins';

/**
 * The factory for JSON blocks: templates compiled in the browser and
 * blocks from addons published before importable opcodes. Such a block
 * resolves built-ins by name at runtime, so the tables must be filled.
 */
export default function template(
  serialized: Parameters<typeof legacyTemplateFactory>[0]
): TemplateFactory {
  ensureBuiltins();
  return legacyTemplateFactory(serialized);
}
