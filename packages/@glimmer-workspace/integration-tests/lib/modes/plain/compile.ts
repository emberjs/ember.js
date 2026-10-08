import type {
  SerializedTemplateWithLazyBlock,
  Template,
  TemplateFactory,
} from '@glimmer/interfaces';
import type { PrecompileOptions } from '@glimmer/syntax';
import { precompileJSON } from '@glimmer/compiler';
import { templateFactory } from '@glimmer/opcode-compiler';

let templateId = 0;

/**
 * Compiles with the plain Glimmer compiler, without Ember's `compileOptions` (no Ember AST
 * plugins, no keyword list, no component-name dasherizing). For the VM-level tests of
 * `test/vm/`, which exercise capabilities that Ember's template language does not expose.
 */
export function preprocessPlainGlimmer(
  templateSource: string,
  options: PrecompileOptions,
  owner: object
): Template {
  let [block] = precompileJSON(templateSource, options);
  let templateBlock: SerializedTemplateWithLazyBlock = {
    id: String(templateId++),
    block: JSON.stringify(block),
    moduleName: options.meta?.moduleName ?? '(unknown template module)',
    scope: null,
    isStrictMode: false,
  };

  return templateFactory(templateBlock)(owner);
}
