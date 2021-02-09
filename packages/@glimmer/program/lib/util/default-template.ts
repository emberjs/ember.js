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
  moduleName: '__default__.hbs',
  block: JSON.stringify(DEFAULT_TEMPLATE_BLOCK),
  scope: null,
  isStrictMode: true,
};
