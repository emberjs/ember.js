import type { PresentArray } from '../../array.js';
import type { Nullable } from '../../core.js';
import type { CurriedType } from '../../curry.js';
import type {
  AppendOpcode,
  AttrOpcode,
  AttrSplatOpcode,
  BlockOpcode,
  CallOpcode,
  CloseElementOpcode,
  CommentOpcode,
  ComponentAttrOpcode,
  ComponentOpcode,
  ConcatOpcode,
  CurryOpcode,
  DebuggerOpcode,
  DynamicArgOpcode,
  DynamicAttrOpcode,
  EachOpcode,
  FlushElementOpcode,
  GetDynamicVarOpcode,
  GetFreeAsComponentHeadOpcode,
  GetFreeAsComponentOrHelperHeadOpcode,
  GetFreeAsHelperHeadOpcode,
  GetFreeAsModifierHeadOpcode,
  GetLexicalSymbolOpcode,
  GetStrictKeywordOpcode,
  GetSymbolOpcode,
  HasBlockOpcode,
  HasBlockParamsOpcode,
  IfInlineOpcode,
  IfOpcode,
  InElementOpcode,
  InvokeComponentOpcode,
  LetOpcode,
  LogOpcode,
  ModifierOpcode,
  NotOpcode,
  OpenElementOpcode,
  OpenElementWithSplatOpcode,
  StaticArgOpcode,
  StaticAttrOpcode,
  StaticComponentAttrOpcode,
  TrustingAppendOpcode,
  TrustingComponentAttrOpcode,
  TrustingDynamicAttrOpcode,
  UndefinedOpcode,
  WithDynamicVarsOpcode,
  YieldOpcode,
} from './opcodes.js';

export * from './opcodes.js';
export * from './resolution.js';

export type TupleSyntax = Statement | TupleExpression;

export type TemplateReference = Nullable<SerializedBlock>;
export type YieldTo = number;

export type StatementSexpOpcode = Statement[0];
export type StatementSexpOpcodeMap = {
  [TSexpOpcode in Statement[0]]: Extract<Statement, { 0: TSexpOpcode }>;
};
export type ExpressionSexpOpcode = TupleExpression[0];
export type ExpressionSexpOpcodeMap = {
  [TSexpOpcode in TupleExpression[0]]: Extract<TupleExpression, { 0: TSexpOpcode }>;
};

export interface SexpOpcodeMap extends ExpressionSexpOpcodeMap, StatementSexpOpcodeMap {}
export type SexpOpcode = keyof SexpOpcodeMap;

export namespace Core {
  export type Expression = Expressions.Expression;

  export type CallArgs = [Params, Hash];
  export type Path = [string, ...string[]];
  export type ConcatParams = PresentArray<Expression>;
  export type Params = Nullable<ConcatParams>;
  export type Hash = Nullable<[PresentArray<string>, PresentArray<Expression>]>;
  export type Blocks = Nullable<[string[], SerializedInlineBlock[]]>;
  export type Args = [Params, Hash];
  export type NamedBlock = [string, SerializedInlineBlock];
  export type DebugInfo = number[];
  export type ElementParameters = Nullable<PresentArray<ElementParameter>>;

  export type Syntax = Path | Params | ConcatParams | Hash | Blocks | Args | DebugInfo;
}

export type CoreSyntax = Core.Syntax;

export namespace Expressions {
  export type Path = Core.Path;
  export type Params = Core.Params;
  export type Hash = Core.Hash;

  export type GetSymbol = [GetSymbolOpcode, number];
  export type GetLexicalSymbol = [GetLexicalSymbolOpcode, number];
  export type GetStrictFree = [GetStrictKeywordOpcode, number];
  export type GetFreeAsComponentOrHelperHead = [GetFreeAsComponentOrHelperHeadOpcode, number];
  export type GetFreeAsHelperHead = [GetFreeAsHelperHeadOpcode, number];
  export type GetFreeAsModifierHead = [GetFreeAsModifierHeadOpcode, number];
  export type GetFreeAsComponentHead = [GetFreeAsComponentHeadOpcode, number];

  export type GetContextualFree =
    | GetFreeAsComponentOrHelperHead
    | GetFreeAsHelperHead
    | GetFreeAsModifierHead
    | GetFreeAsComponentHead;
  export type GetFree = GetStrictFree | GetContextualFree;
  export type GetVar = GetSymbol | GetLexicalSymbol | GetFree;

  export type GetPathSymbol = [GetSymbolOpcode, number, Path];
  export type GetPathTemplateSymbol = [GetLexicalSymbolOpcode, number, Path];
  export type GetPathFreeAsComponentOrHelperHead = [
    GetFreeAsComponentOrHelperHeadOpcode,
    number,
    Path,
  ];
  export type GetPathFreeAsHelperHead = [GetFreeAsHelperHeadOpcode, number, Path];
  export type GetPathFreeAsModifierHead = [GetFreeAsModifierHeadOpcode, number, Path];
  export type GetPathFreeAsComponentHead = [GetFreeAsComponentHeadOpcode, number, Path];

  export type GetPathContextualFree =
    | GetPathFreeAsComponentOrHelperHead
    | GetPathFreeAsHelperHead
    | GetPathFreeAsModifierHead
    | GetPathFreeAsComponentHead;
  export type GetPath = GetPathSymbol | GetPathTemplateSymbol | GetPathContextualFree;

  export type Get = GetVar | GetPath;

  export type StringValue = string;
  export type NumberValue = number;
  export type BooleanValue = boolean;
  export type NullValue = null;
  export type Value = StringValue | NumberValue | BooleanValue | NullValue;
  export type Undefined = [UndefinedOpcode];

  export type TupleExpression =
    | Get
    | GetDynamicVar
    | Concat
    | HasBlock
    | HasBlockParams
    | Curry
    | Helper
    | Undefined
    | IfInline
    | Not
    | Log;

  // TODO get rid of undefined, which is just here to allow trailing undefined in attrs
  // it would be better to handle that as an over-the-wire encoding concern
  export type Expression = TupleExpression | Value | undefined;

  export type Concat = [ConcatOpcode, Core.ConcatParams];
  export type Helper = [CallOpcode, Expression, Nullable<Params>, Hash];
  export type HasBlock = [HasBlockOpcode, Expression];
  export type HasBlockParams = [HasBlockParamsOpcode, Expression];
  export type Curry = [CurryOpcode, Expression, CurriedType, Params, Hash];

  export type IfInline = [
    op: IfInlineOpcode,
    condition: Expression,
    truthyValue: Expression,
    falsyValue?: Nullable<Expression>,
  ];

  export type Not = [op: NotOpcode, value: Expression];

  export type GetDynamicVar = [op: GetDynamicVarOpcode, value: Expression];

  export type Log = [op: LogOpcode, positional: Params];
}

export type Expression = Expressions.Expression;
export type Get = Expressions.GetVar;

export type TupleExpression = Expressions.TupleExpression;

export type ClassAttr = 0;
export type IdAttr = 1;
export type ValueAttr = 2;
export type NameAttr = 3;
export type TypeAttr = 4;
export type StyleAttr = 5;
export type HrefAttr = 6;

export type WellKnownAttrName =
  | ClassAttr
  | IdAttr
  | ValueAttr
  | NameAttr
  | TypeAttr
  | StyleAttr
  | HrefAttr;

export type DivTag = 0;
export type SpanTag = 1;
export type PTag = 2;
export type ATag = 3;

export type WellKnownTagName = DivTag | SpanTag | PTag | ATag;

export namespace Statements {
  export type Expression = Expressions.Expression | undefined;
  export type Params = Core.Params;
  export type Hash = Core.Hash;
  export type Blocks = Core.Blocks;
  export type Path = Core.Path;

  export type Append = [AppendOpcode, Expression];
  export type TrustingAppend = [TrustingAppendOpcode, Expression];
  export type Comment = [CommentOpcode, string];
  export type Modifier = [ModifierOpcode, Expression, Params, Hash];
  export type Block = [BlockOpcode, Expression, Params, Hash, Blocks];
  export type Component = [
    op: ComponentOpcode,
    tag: Expression,
    parameters: Core.ElementParameters,
    args: Hash,
    blocks: Blocks,
  ];
  export type OpenElement = [OpenElementOpcode, string | WellKnownTagName];
  export type OpenElementWithSplat = [OpenElementWithSplatOpcode, string | WellKnownTagName];
  export type FlushElement = [FlushElementOpcode];
  export type CloseElement = [CloseElementOpcode];

  type Attr<Op extends AttrOpcode> = [
    op: Op,
    name: string | WellKnownAttrName,
    value: Expression,
    namespace?: string | undefined,
  ];

  export type StaticAttr = Attr<StaticAttrOpcode>;
  export type StaticComponentAttr = Attr<StaticComponentAttrOpcode>;

  export type AnyStaticAttr = StaticAttr | StaticComponentAttr;

  export type AttrSplat = [AttrSplatOpcode, YieldTo];
  export type Yield = [YieldOpcode, YieldTo, Nullable<Params>];
  export type DynamicArg = [DynamicArgOpcode, string, Expression];
  export type StaticArg = [StaticArgOpcode, string, Expression];

  export type DynamicAttr = Attr<DynamicAttrOpcode>;
  export type ComponentAttr = Attr<ComponentAttrOpcode>;
  export type TrustingDynamicAttr = Attr<TrustingDynamicAttrOpcode>;
  export type TrustingComponentAttr = Attr<TrustingComponentAttrOpcode>;

  export type AnyDynamicAttr =
    | DynamicAttr
    | ComponentAttr
    | TrustingDynamicAttr
    | TrustingComponentAttr;

  export type Debugger = [DebuggerOpcode, Core.DebugInfo];
  export type InElement = [
    op: InElementOpcode,
    block: SerializedInlineBlock,
    guid: string,
    destination: Expression,
    insertBefore?: Expression,
  ];

  export type If = [
    op: IfOpcode,
    condition: Expression,
    block: SerializedInlineBlock,
    inverse: Nullable<SerializedInlineBlock>,
  ];

  export type Each = [
    op: EachOpcode,
    condition: Expression,
    key: Nullable<Expression>,
    block: SerializedInlineBlock,
    inverse: Nullable<SerializedInlineBlock>,
  ];

  export type Let = [op: LetOpcode, positional: Core.Params, block: SerializedInlineBlock];

  export type WithDynamicVars = [
    op: WithDynamicVarsOpcode,
    args: Core.Hash,
    block: SerializedInlineBlock,
  ];

  export type InvokeComponent = [
    op: InvokeComponentOpcode,
    definition: Expression,
    positional: Core.Params,
    named: Core.Hash,
    blocks: Blocks | null,
  ];

  /**
   * A Handlebars statement
   */
  export type Statement =
    | Append
    | TrustingAppend
    | Comment
    | Modifier
    | Block
    | Component
    | OpenElement
    | OpenElementWithSplat
    | FlushElement
    | CloseElement
    | Attribute
    | AttrSplat
    | Yield
    | StaticArg
    | DynamicArg
    | Debugger
    | InElement
    | If
    | Each
    | Let
    | WithDynamicVars
    | InvokeComponent;

  export type Attribute =
    | StaticAttr
    | StaticComponentAttr
    | DynamicAttr
    | TrustingDynamicAttr
    | ComponentAttr
    | TrustingComponentAttr;

  export type ComponentFeature = Modifier | AttrSplat;
  export type Argument = StaticArg | DynamicArg;

  export type ElementParameter = Attribute | Argument | ComponentFeature;
}

/** A Handlebars statement */
export type Statement = Statements.Statement;
export type Attribute = Statements.Attribute;
export type Argument = Statements.Argument;
export type ElementParameter = Statements.ElementParameter;

export type SexpSyntax = Statement | TupleExpression;
// TODO this undefined is related to the other TODO in this file
export type Syntax = SexpSyntax | Expressions.Value | undefined;

export type SyntaxWithInternal =
  | Syntax
  | CoreSyntax
  | SerializedTemplateBlock
  | Core.CallArgs
  | Core.NamedBlock
  | Core.ElementParameters;

/**
 * A JSON object that the Block was serialized into.
 */
export type SerializedBlock = [statements: Statements.Statement[]];

export type SerializedInlineBlock = [statements: Statements.Statement[], parameters: number[]];

/**
 * A JSON object that the compiled TemplateBlock was serialized into.
 */
export type SerializedTemplateBlock = [
  // statements
  Statements.Statement[],
  // symbols
  string[],
  // hasDebug
  boolean,
  // upvars
  string[],
];

/**
 * A JSON object that the compiled Template was serialized into.
 */
export interface SerializedTemplate {
  block: SerializedTemplateBlock;
  id?: Nullable<string>;
  moduleName: string;
}

/**
 * A string of JSON containing a SerializedTemplateBlock
 */
export type SerializedTemplateBlockJSON = string;

/**
 * A JSON object containing the SerializedTemplateBlock as JSON and TemplateMeta.
 */
export interface SerializedTemplateWithLazyBlock {
  id?: Nullable<string>;
  block: SerializedTemplateBlockJSON;
  moduleName: string;
  scope?: (() => unknown[]) | undefined | null;
  isStrictMode: boolean;
}

/**
 * A string of Javascript containing a SerializedTemplateWithLazyBlock to be
 * concatenated into a Javascript module.
 */
export type TemplateJavascript = string;
