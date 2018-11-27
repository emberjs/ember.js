import './lib/bootstrap';

export { renderMain, renderComponent, TemplateIterator, RenderComponentArgs } from './lib/render';

export {
  NULL_REFERENCE,
  UNDEFINED_REFERENCE,
  PrimitiveReference,
  ConditionalReference,
} from './lib/references';

export {
  setDebuggerCallback,
  resetDebuggerCallback,
  DebugCallback,
} from './lib/compiled/opcodes/debugger';

export { default as getDynamicVar } from './lib/helpers/get-dynamic-var';

export { PublicVM as VM, InternalVM, VM as LowLevelVM, UpdatingVM, RenderResult } from './lib/vm';

export { SimpleDynamicAttribute, DynamicAttribute } from './lib/vm/attributes/dynamic';

export {
  IArguments as Arguments,
  ICapturedArguments as CapturedArguments,
  IPositionalArguments as PositionalArguments,
  ICapturedPositionalArguments as CapturedPositionalArguments,
  INamedArguments as NamedArguments,
  ICapturedNamedArguments as CapturedNamedArguments,
  EMPTY_ARGS,
} from './lib/vm/arguments';

export { SafeString } from './lib/upsert';

export {
  ScopeImpl,
  default as Environment,
  DefaultEnvironment,
  Helper,
  DynamicScope,
  CompilationOptions,
} from './lib/environment';

export {
  DEFAULT_CAPABILITIES,
  MINIMAL_CAPABILITIES,
  ComponentManager,
  PublicComponentDefinition as ComponentDefinition,
  WithDynamicTagName,
  PreparedArguments,
  WithDynamicLayout,
  Invocation,
  WithStaticLayout,
} from './lib/component/interfaces';

export {
  CurriedComponentDefinition,
  isCurriedComponentDefinition,
  curry,
} from './lib/component/curried-component';

export {
  PublicModifierDefinition as ModifierDefinition,
  ModifierManager,
} from './lib/modifier/interfaces';

export {
  default as DOMChanges,
  SVG_NAMESPACE,
  DOMChanges as IDOMChanges,
  DOMTreeConstruction,
  isWhitespace,
} from './lib/dom/helper';
export { normalizeProperty } from './lib/dom/props';
export {
  ElementBuilder,
  NewElementBuilder,
  ElementOperations,
  clientBuilder,
} from './lib/vm/element-builder';
export { rehydrationBuilder, RehydrateBuilder } from './lib/vm/rehydrate-builder';
export { default as Bounds, ConcreteBounds, Cursor } from './lib/bounds';
export { capabilityFlagsFrom, hasCapability, Capability } from './lib/capabilities';

/**
 * @deprecated use RichIteratorResult<Tick, Return> or TemplateIterator instead
 */
import { RichIteratorResult } from '@glimmer/interfaces';
export type IteratorResult<T> = RichIteratorResult<null, T>;
