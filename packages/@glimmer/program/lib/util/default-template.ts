import type { SerializedTemplateBlock } from '@glimmer/interfaces';
import type { SerializedTemplateWithOps } from '@glimmer/opcode-compiler/lib/template-core';
import { YieldOp } from '@glimmer/opcode-compiler/lib/syntax/statements';

/**
 * Default component template, which is a plain yield
 */
const DEFAULT_TEMPLATE_BLOCK = [
  [[YieldOp, 1, null]],
  ['&default'],
  [],
] as unknown as SerializedTemplateBlock;

export const DEFAULT_TEMPLATE: SerializedTemplateWithOps = {
  // random uuid
  id: '1b32f5c2-7623-43d6-a0ad-9672898920a1',
  moduleName: '__default__.hbs',
  block: DEFAULT_TEMPLATE_BLOCK,
  scope: null,
  isStrictMode: true,
};
