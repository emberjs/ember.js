/**
 * @deprecated use RichIteratorResult<Tick, Return> or TemplateIterator instead
 */
import { RichIteratorResult } from '@glimmer/interfaces';
import './lib/bootstrap';

export { clear, ConcreteBounds, CursorImpl } from './lib/bounds';
export {
  DebugCallback,
  resetDebuggerCallback,
  setDebuggerCallback,
} from './lib/compiled/opcodes/debugger';
export { curry, CurriedValue } from './lib/curried-value';
export {
  TemplateOnlyComponentManager,
  TEMPLATE_ONLY_COMPONENT_MANAGER,
  TemplateOnlyComponentDefinition as TemplateOnlyComponent,
  templateOnlyComponent,
} from './lib/component/template-only';
export {
  default as DOMChanges,
  DOMChangesImpl as IDOMChanges,
  DOMTreeConstruction,
  isWhitespace,
} from './lib/dom/helper';
export { normalizeProperty } from './lib/dom/props';
export { DynamicScopeImpl, PartialScopeImpl } from './lib/scope';
export {
  runtimeContext,
  EnvironmentImpl,
  EnvironmentDelegate,
  inTransaction,
} from './lib/environment';
export { renderComponent, renderMain, renderSync } from './lib/render';
export { SafeString } from './lib/upsert';
export { InternalVM, UpdatingVM, VM as LowLevelVM } from './lib/vm';
export {
  EMPTY_ARGS,
  EMPTY_NAMED,
  EMPTY_POSITIONAL,
  createCapturedArgs,
  reifyArgs,
  reifyNamed,
  reifyPositional,
} from './lib/vm/arguments';
export {
  DynamicAttribute,
  dynamicAttribute,
  SimpleDynamicAttribute,
} from './lib/vm/attributes/dynamic';
export {
  clientBuilder,
  NewElementBuilder,
  UpdatableBlockImpl,
  RemoteLiveBlock,
} from './lib/vm/element-builder';
export {
  isSerializationFirstNode,
  RehydrateBuilder,
  rehydrationBuilder,
  SERIALIZATION_FIRST_NODE_STRING,
} from './lib/vm/rehydrate-builder';
export { invokeHelper } from './lib/helpers/invoke';

export { default as fn } from './lib/helpers/fn';
export { default as hash, isHashProxy } from './lib/helpers/hash';
export { default as array } from './lib/helpers/array';
export { default as get } from './lib/helpers/get';
export { default as concat } from './lib/helpers/concat';

export { default as on } from './lib/modifiers/on';

// Currently we need to re-export these values for @glimmer/component
// https://github.com/glimmerjs/glimmer.js/issues/319
export { destroy, registerDestructor, isDestroying, isDestroyed } from '@glimmer/destroyable';

export type IteratorResult<T> = RichIteratorResult<null, T>;
