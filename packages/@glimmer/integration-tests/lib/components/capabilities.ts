import { ComponentCapabilities } from '@glimmer/interfaces';

export const BASIC_CAPABILITIES: ComponentCapabilities = {
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: false,
  createArgs: false,
  attributeHook: false,
  elementHook: false,
  dynamicScope: false,
  createCaller: false,
  updateHook: false,
  createInstance: true,
  wrapped: false,
};

export const STATIC_TAGLESS_CAPABILITIES = {
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: false,
  createArgs: false,
  attributeHook: false,
  elementHook: false,
  dynamicScope: false,
  updateHook: false,
  createCaller: false,
  createInstance: false,
  wrapped: false,
};

export const CURLY_CAPABILITIES: ComponentCapabilities = {
  dynamicLayout: true,
  dynamicTag: true,
  prepareArgs: true,
  createArgs: true,
  attributeHook: true,
  elementHook: true,
  dynamicScope: true,
  createCaller: true,
  updateHook: true,
  createInstance: true,
  wrapped: true,
};

export const EMBERISH_CURLY_CAPABILITIES: ComponentCapabilities = {
  ...CURLY_CAPABILITIES,
  dynamicLayout: false,
  attributeHook: false,
};
