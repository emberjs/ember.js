import type { AotTemplate } from '@glimmer/opcode-compiler/lib/aot/template';
import {
  DEFAULT_TEMPLATE as BLOCK,
  DEFAULT_TEMPLATE_WRAPPED,
} from '@glimmer/opcode-compiler/lib/opcode-builder/stdlib-data';

/**
 * Default component template, which is a plain yield. Compiled ahead of
 * time by `bin/build-aot-stdlib.mjs`, in both plain and wrapped forms.
 */
export const DEFAULT_TEMPLATE: AotTemplate = {
  // random uuid
  id: '1b32f5c2-7623-43d6-a0ad-9672898920a1',
  block: BLOCK,
  moduleName: '__default__.hbs',
  isStrictMode: true,
};

export { DEFAULT_TEMPLATE_WRAPPED };
