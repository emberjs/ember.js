/**
 * @deprecated use RichIteratorResult<Tick, Return> or TemplateIterator instead
 */
import './lib/bootstrap';

import type { RichIteratorResult } from '@glimmer/interfaces';

export { clear, ConcreteBounds, CursorImpl } from './lib/bounds';
export {
  type DebugCallback,
  resetDebuggerCallback,
  setDebuggerCallback,
} from './lib/compiled/opcodes/debugger';
export {
  TEMPLATE_ONLY_COMPONENT_MANAGER,
  TemplateOnlyComponentDefinition as TemplateOnlyComponent,
  templateOnlyComponent,
  TemplateOnlyComponentManager,
} from './lib/component/template-only';
export { CurriedValue, curry } from './lib/curried-value';
export {
  DOMChanges,
  DOMTreeConstruction,
  DOMChangesImpl as IDOMChanges,
  isWhitespace,
} from './lib/dom/helper';
export { normalizeProperty } from './lib/dom/props';
export {
  type EnvironmentDelegate,
  EnvironmentImpl,
  inTransaction,
  runtimeContext,
} from './lib/environment';
export { array } from './lib/helpers/array';
export { concat } from './lib/helpers/concat';
export { fn } from './lib/helpers/fn';
export { get } from './lib/helpers/get';
export { hash } from './lib/helpers/hash';
export { invokeHelper } from './lib/helpers/invoke';
export { on } from './lib/modifiers/on';
export { renderComponent, renderMain, renderSync } from './lib/render';
export { DynamicScopeImpl, PartialScopeImpl } from './lib/scope';
export type { SafeString } from './lib/upsert';
export { type InternalVM, VM as LowLevelVM, UpdatingVM } from './lib/vm';
export {
  createCapturedArgs,
  EMPTY_ARGS,
  EMPTY_NAMED,
  EMPTY_POSITIONAL,
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
  RemoteLiveBlock,
  UpdatableBlockImpl,
} from './lib/vm/element-builder';
export {
  isSerializationFirstNode,
  RehydrateBuilder,
  rehydrationBuilder,
  SERIALIZATION_FIRST_NODE_STRING,
} from './lib/vm/rehydrate-builder';

// Currently we need to re-export these values for @glimmer/component
// https://github.com/glimmerjs/glimmer.js/issues/319
export { destroy, isDestroyed, isDestroying, registerDestructor } from '@glimmer/destroyable';

export type IteratorResult<T> = RichIteratorResult<null, T>;
