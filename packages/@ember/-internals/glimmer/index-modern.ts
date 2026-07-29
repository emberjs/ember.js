/*
  The modern replacement for this package's `index.ts`, swapped in at the
  build level for variants without classic components. It must mirror the
  export list at the bottom of `index.ts`, minus the classic `Component`
  default export — dropping that single export is what removes the classic
  component implementation (component.ts, the curly component manager,
  bindings, view states) from the rolled-up module graph.
*/

export { default as template, templateCacheCounters } from '@glimmer/opcode-compiler/lib/template';

export { default as RootTemplate } from './lib/templates/root';
export { default as Input } from './lib/components/input';
export { default as LinkTo } from './lib/components/link-to';
export { default as Textarea } from './lib/components/textarea';
export {
  default as Helper,
  helper,
  type FunctionBasedHelper,
  type FunctionBasedHelperInstance,
  type HelperFactory,
  type SimpleHelper,
} from './lib/helper';
export {
  TrustedHTML,
  SafeString,
  trustHTML,
  isTrustedHTML,
  htmlSafe,
  isHTMLSafe,
} from './lib/utils/string';
export {
  Renderer,
  _resetRenderers,
  renderSettled,
  renderComponent,
  type View,
} from './lib/renderer';
export {
  getTemplate,
  setTemplate,
  hasTemplate,
  getTemplates,
  setTemplates,
  type TemplatesRegistry,
} from './lib/template_registry';
export { setupEngineRegistry, setupApplicationRegistry } from './lib/setup-registry';
export { DOMChanges, NodeDOMTreeConstruction, DOMTreeConstruction } from './lib/dom';

export { default as OutletView, type BootEnvironment } from './lib/views/outlet';
export type { OutletState, RenderState } from './lib/utils/outlet';
export {
  componentCapabilities,
  modifierCapabilities,
  setComponentManager,
} from './lib/utils/managers';
export { isSerializationFirstNode } from './lib/utils/serialization-first-node-helpers';
export { default as element } from './lib/helpers/element';
export { uniqueId } from './lib/helpers/unique-id';
