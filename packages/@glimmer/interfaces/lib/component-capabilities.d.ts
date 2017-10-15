export default interface ComponentCapabilities {
  dynamicLayout: boolean;
  dynamicTag: boolean;
  prepareArgs: boolean;
  createArgs: boolean;
  attributeHook: boolean;
  elementHook: boolean;
}
