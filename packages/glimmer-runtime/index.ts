export {
  ATTRIBUTE as ATTRIBUTE_SYNTAX,
  Statement as StatementSyntax,
  Expression as ExpressionSyntax,
  Attribute as AttributeSyntax,
  StatementCompilationBuffer,
  SymbolLookup,
  CompileInto,
  isAttribute
} from './lib/syntax';

export { default as templateFactory, TemplateFactory, Template } from './lib/template';

export { default as SymbolTable } from './lib/symbol-table';

export { NULL_REFERENCE, UNDEFINED_REFERENCE, PrimitiveReference, ConditionalReference } from './lib/references';

export {
  Templates,
  OptimizedAppend,
  UnoptimizedAppend,
  Unknown,
  StaticAttr,
  DynamicAttr,
  Args as ArgsSyntax,
  NamedArgs as NamedArgsSyntax,
  PositionalArgs as PositionalArgsSyntax,
  Ref as RefSyntax,
  GetArgument as GetNamedParameterSyntax,
  Get as GetSyntax,
  Value as ValueSyntax,
  OpenElement,
  Helper as HelperSyntax,
  Block as BlockSyntax,
  OpenPrimitiveElement as OpenPrimitiveElementSyntax,
  CloseElement as CloseElementSyntax
} from './lib/syntax/core';

export {
   default as OpcodeBuilderDSL
} from './lib/compiled/opcodes/builder';

export {
  default as Compiler,
  Compilable,
  CompileIntoList,
  compileLayout
} from './lib/compiler';

export {
  ComponentBuilder,
  StaticDefinition,
  DynamicDefinition
} from './lib/opcode-builder';

export {
  Block,
  CompiledBlock,
  Layout,
  InlineBlock,
  EntryPoint
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
  normalizeTextValue
} from './lib/compiled/opcodes/content';

export {
  CompiledExpression
} from './lib/compiled/expressions';

export {
  CompiledArgs,
  CompiledNamedArgs,
  CompiledPositionalArgs,
  EvaluatedArgs,
  EvaluatedNamedArgs,
  EvaluatedPositionalArgs
} from './lib/compiled/expressions/args';

export {
  FunctionExpression
} from './lib/compiled/expressions/function';

export {
  default as getDynamicVar
} from './lib/helpers/get-dynamic-var';

export {
  default as WithDynamicVarsSyntax
} from './lib/syntax/builtins/with-dynamic-vars';

export {
  default as InElementSyntax
} from './lib/syntax/builtins/in-element';

export { PublicVM as VM, UpdatingVM, RenderResult } from './lib/vm';

export { SafeString, isSafeString } from './lib/upsert';

export {
  Scope,
  default as Environment,
  Helper,
  ParsedStatement,
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
  isComponentDefinition
} from './lib/component/interfaces';

export {
  ModifierManager
} from './lib/modifier/interfaces';

export { default as DOMChanges, DOMChanges as IDOMChanges, DOMTreeConstruction, isWhitespace, insertHTMLBefore } from './lib/dom/helper';
import  * as Simple from './lib/dom/interfaces';
export { Simple };
export { ElementStack, ElementOperations } from './lib/builder';
export { default as Bounds, ConcreteBounds } from './lib/bounds';
