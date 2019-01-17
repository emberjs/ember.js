/**
 * @deprecated use RichIteratorResult<Tick, Return> or TemplateIterator instead
 */
import { RichIteratorResult } from '@glimmer/interfaces';
import './lib/bootstrap';

export { clear, ConcreteBounds, CursorImpl } from './lib/bounds';
export { Capability, capabilityFlagsFrom, hasCapability } from './lib/capabilities';
export {
  DebugCallback,
  resetDebuggerCallback,
  setDebuggerCallback,
} from './lib/compiled/opcodes/debugger';
export {
  CurriedComponentDefinition,
  curry,
  isCurriedComponentDefinition,
} from './lib/component/curried-component';
export { DEFAULT_CAPABILITIES, MINIMAL_CAPABILITIES } from './lib/component/interfaces';
export * from './lib/component/manager';
export {
  default as DOMChanges,
  DOMChangesImpl as IDOMChanges,
  DOMTreeConstruction,
  isWhitespace,
} from './lib/dom/helper';
export { normalizeProperty } from './lib/dom/props';
export { DefaultDynamicScope } from './lib/dynamic-scope';
export {
  AotRuntime,
  default as EnvironmentImpl,
  DefaultEnvironment,
  JitRuntime,
  RuntimeEnvironment,
  RuntimeEnvironmentDelegate,
  ScopeImpl,
} from './lib/environment';
export { default as getDynamicVar } from './lib/helpers/get-dynamic-var';
export { PublicModifierDefinition as ModifierDefinition } from './lib/modifier/interfaces';
export {
  ConditionalReference,
  NULL_REFERENCE,
  PrimitiveReference,
  UNDEFINED_REFERENCE,
} from './lib/references';
export {
  renderAot,
  renderAotComponent,
  renderAotMain,
  RenderComponentArgs,
  renderJitComponent,
  renderJitMain,
  renderSync,
} from './lib/render';
export { SafeString } from './lib/upsert';
export { InternalVM, UpdatingVM, VM as LowLevelVM } from './lib/vm';
export { EMPTY_ARGS } from './lib/vm/arguments';
export { AttributeOperation } from './lib/vm/attributes';
export {
  DynamicAttribute,
  dynamicAttribute,
  SimpleDynamicAttribute,
} from './lib/vm/attributes/dynamic';
export { clientBuilder, NewElementBuilder } from './lib/vm/element-builder';
export {
  isSerializationFirstNode,
  RehydrateBuilder,
  rehydrationBuilder,
  SERIALIZATION_FIRST_NODE_STRING,
} from './lib/vm/rehydrate-builder';

export type IteratorResult<T> = RichIteratorResult<null, T>;
