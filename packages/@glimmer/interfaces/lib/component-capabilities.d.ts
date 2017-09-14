export default interface ComponentCapabilities {
  staticDefinitions: boolean;
  dynamicLayout: boolean;
  dynamicTag: boolean;
  prepareArgs: boolean;
  createArgs: boolean;
  attributeHook: boolean;
  elementHook: boolean;
}
