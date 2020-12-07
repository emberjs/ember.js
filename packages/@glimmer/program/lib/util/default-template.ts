import {
  SerializedTemplateBlock,
  SerializedTemplateWithLazyBlock,
  SexpOpcodes,
} from '@glimmer/interfaces';

/**
 * Default component template, which is a plain yield
 */
const DEFAULT_TEMPLATE_BLOCK: SerializedTemplateBlock = [
  [[SexpOpcodes.Yield, 1, null]],
  ['&default'],
  false,
  [],
];

export const DEFAULT_TEMPLATE: SerializedTemplateWithLazyBlock = {
  // random uuid
  id: '1b32f5c2-7623-43d6-a0ad-9672898920a1',
  moduleName: '__default__.hbs',
  block: JSON.stringify(DEFAULT_TEMPLATE_BLOCK),
  scope: null,
  isStrictMode: true,
};
