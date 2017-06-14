import './lib/bootstrap';

export { default as templateFactory, TemplateFactory, Template, TemplateIterator, RenderOptions } from './lib/template';

export { NULL_REFERENCE, UNDEFINED_REFERENCE, PrimitiveReference, ConditionalReference } from './lib/references';

export {
   default as OpcodeBuilderDSL
} from './lib/compiled/opcodes/builder';

export {
  CompilableLayout,
  compileLayout
} from './lib/compiler';

export {
  ComponentBuilder,
  ComponentArgs
} from './lib/opcode-builder';

export {
  CompiledStaticTemplate,
  CompiledDynamicTemplate,
  CompiledDynamicBlock,
  CompiledDynamicProgram
} from './lib/compiled/blocks';

export {
  Register,
  debugSlice
} from './lib/opcodes';

export {
  setDebuggerCallback,
  resetDebuggerCallback,
  DebugCallback
} from './lib/compiled/opcodes/debugger';

export {
  default as getDynamicVar
} from './lib/helpers/get-dynamic-var';

export {
  Blocks as BlockMacros,
  Inlines as InlineMacros,
  BlockMacro,
  MissingBlockMacro,
  compileList,
  expr as compileExpression
} from './lib/syntax/functions';

export {
  CompilableTemplate,
  Block,
  Program
} from './lib/syntax/interfaces';

export { PublicVM as VM, UpdatingVM, RenderResult, IteratorResult } from './lib/vm';

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
  Helper,
  DynamicScope,
} from './lib/environment';

export {
  PartialDefinition
} from './lib/partial';

export {
  Component,
  ComponentClass,
  ComponentManager,
  ComponentDefinition,
  ComponentLayoutBuilder,
  ComponentAttrsBuilder,
  PreparedArguments,
  isComponentDefinition
} from './lib/component/interfaces';

export {
  ModifierManager
} from './lib/modifier/interfaces';

export { default as DOMChanges, SVG_NAMESPACE, DOMChanges as IDOMChanges, DOMTreeConstruction, isWhitespace, insertHTMLBefore } from './lib/dom/helper';
export { normalizeProperty } from './lib/dom/props';
export { ElementBuilder, NewElementBuilder, ElementOperations } from './lib/vm/element-builder';
export { default as Bounds, ConcreteBounds } from './lib/bounds';
