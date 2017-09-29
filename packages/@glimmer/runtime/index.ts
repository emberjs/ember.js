import './lib/bootstrap';

export { default as templateFactory, ScannableTemplate, TemplateFactory, Template, TemplateIterator, RenderLayoutOptions } from './lib/template';

export { NULL_REFERENCE, UNDEFINED_REFERENCE, PrimitiveReference, ConditionalReference } from './lib/references';

export {
  setDebuggerCallback,
  resetDebuggerCallback,
  DebugCallback
} from './lib/compiled/opcodes/debugger';

export {
  default as getDynamicVar
} from './lib/helpers/get-dynamic-var';

export {
  CompilableTemplate,
  BlockSyntax,
  TopLevelSyntax
} from './lib/syntax/interfaces';

export { PublicVM as VM, VM as LowLevelVM, UpdatingVM, RenderResult, IteratorResult } from './lib/vm';

export {
  SimpleDynamicAttribute,
  DynamicAttributeFactory,
  DynamicAttribute
} from './lib/vm/attributes/dynamic';

export {
  IArguments as Arguments,
  ICapturedArguments as CapturedArguments,
  IPositionalArguments as PositionalArguments,
  ICapturedPositionalArguments as CapturedPositionalArguments,
  INamedArguments as NamedArguments,
  ICapturedNamedArguments as CapturedNamedArguments,
} from './lib/vm/arguments';

export { SafeString } from './lib/upsert';

export {
  Scope,
  default as Environment,
  DefaultEnvironment,
  Helper,
  DynamicScope,
  CompilationOptions
} from './lib/environment';

export {
  PartialDefinition
} from './lib/partial';

export {
  ComponentManager,
  PublicComponentDefinition as ComponentDefinition,
  WithDynamicTagName,
  PreparedArguments,
  WithDynamicLayout,
  Invocation,
  WithStaticLayout
} from './lib/component/interfaces';

export {
  CurriedComponentDefinition,
  isCurriedComponentDefinition,
  curry
} from './lib/component/curried-component';

export {
} from './lib/compiled/opcodes/component';

export {
  ModifierManager,
  Modifier
} from './lib/modifier/interfaces';

export { default as DOMChanges, SVG_NAMESPACE, DOMChanges as IDOMChanges, DOMTreeConstruction, isWhitespace, insertHTMLBefore } from './lib/dom/helper';
export { normalizeProperty } from './lib/dom/props';
export { ElementBuilder, NewElementBuilder, ElementOperations, clientBuilder } from './lib/vm/element-builder';
export { rehydrationBuilder } from './lib/vm/rehydrate-builder';
export { default as Bounds, ConcreteBounds, Cursor } from './lib/bounds';
