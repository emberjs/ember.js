import './lib/bootstrap';

export { default as templateFactory, TemplateFactory, Template } from './lib/template';

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
  AttributeManager as IAttributeManager,
  AttributeManager,
  PropertyManager,
  INPUT_VALUE_PROPERTY_MANAGER,
  defaultManagers,
  defaultAttributeManagers,
  defaultPropertyManagers,
  readDOMAttr
} from './lib/dom/attribute-managers';

export {
  Register,
  debugSlice
} from './lib/opcodes';

export {
  normalizeTextValue
} from './lib/compiled/opcodes/content';

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
  IArguments as Arguments,
  ICapturedArguments as CapturedArguments,
  IPositionalArguments as PositionalArguments,
  ICapturedPositionalArguments as CapturedPositionalArguments,
  INamedArguments as NamedArguments,
  ICapturedNamedArguments as CapturedNamedArguments,
} from './lib/vm/arguments';

export { SafeString, isSafeString } from './lib/upsert';

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

export { default as DOMChanges, DOMChanges as IDOMChanges, DOMTreeConstruction, isWhitespace, insertHTMLBefore } from './lib/dom/helper';
import * as Simple from './lib/dom/interfaces';
export { Simple };
export { ElementStack, ElementOperations } from './lib/builder';
export { default as Bounds, ConcreteBounds } from './lib/bounds';
