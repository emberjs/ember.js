import { Dict, Option, Opaque } from '@glimmer/util';
import { Opcodes } from './lib/opcodes';

export { Opcodes as Ops } from './lib/opcodes';

type JsonValue = string | number | boolean | JsonObject | JsonArray;

interface JsonObject extends Dict<JsonValue> {}
interface JsonArray extends Array<JsonValue> {}

// This entire file is serialized to disk, so all strings
// end up being interned.
export type str = string;
export type TemplateReference = Option<SerializedBlock>;
export type YieldTo = number;

export function is<T>(variant: number): (value: any) => value is T {
  return function(value: any): value is T {
    return Array.isArray(value) && value[0] === variant;
  };
}

export namespace Core {
  export type Expression = Expressions.Expression;

  export type Path = str[];
  export type Params = Expression[];
  export type Hash = Option<[str[], Expression[]]>;
  export type Blocks = Option<[str[], SerializedInlineBlock[]]>;
  export type Args = [Params, Hash];
  export type EvalInfo = number[];
}

export namespace Expressions {
  export type Path = Core.Path;
  export type Params = Core.Params;
  export type Hash = Core.Hash;

  export type Unknown = [Opcodes.Unknown, str];
  export type Get = [Opcodes.Get, number, Path];

  /**
   * Ambiguous between a self lookup (when not inside an eval) and
   * a local variable (when used inside of an eval).
   */
  export type MaybeLocal = [Opcodes.MaybeLocal, Path];

  export type Value = str | number | boolean | null;
  export type HasBlock = [Opcodes.HasBlock, YieldTo];
  export type HasBlockParams = [Opcodes.HasBlockParams, YieldTo];
  export type Undefined = [Opcodes.Undefined];
  export type ClientSide = [Opcodes.ClientSideExpression, any];

  export type TupleExpression =
    | Unknown
    | Get
    | MaybeLocal
    | Concat
    | HasBlock
    | HasBlockParams
    | Helper
    | Undefined
    | ClientSide;

  export type Expression = TupleExpression | Value;

  export interface Concat extends Array<any> {
    [0]: Opcodes.Concat;
    [1]: Params;
  }

  export interface Helper extends Array<any> {
    [0]: Opcodes.Helper;
    [1]: str;
    [2]: Params;
    [3]: Hash;
  }
}

export type Expression = Expressions.Expression;

export type TupleExpression = Expressions.TupleExpression;

export namespace Statements {
  export type Expression = Expressions.Expression;
  export type Params = Core.Params;
  export type Hash = Core.Hash;
  export type Blocks = Core.Blocks;
  export type Path = Core.Path;

  export type Text = [Opcodes.Text, str];
  export type Append = [Opcodes.Append, Expression, boolean];
  export type Comment = [Opcodes.Comment, str];
  export type Modifier = [Opcodes.Modifier, str, Params, Hash];
  export type Block = [Opcodes.Block, str, Params, Hash, Blocks];
  export type Component = [Opcodes.Component, str, Attribute[], Hash, Blocks];
  export type DynamicComponent = [Opcodes.DynamicComponent, Expression, Attribute[], Hash, Blocks];
  export type OpenElement = [Opcodes.OpenElement, str];
  export type SplatElement = [Opcodes.OpenSplattedElement, str];
  export type FlushElement = [Opcodes.FlushElement];
  export type CloseElement = [Opcodes.CloseElement];
  export type StaticAttr = [Opcodes.StaticAttr, str, Expression, Option<str>];
  export type DynamicAttr = [Opcodes.DynamicAttr, str, Expression, Option<str>];
  export type AttrSplat = [Opcodes.AttrSplat, YieldTo];
  export type Yield = [Opcodes.Yield, YieldTo, Option<Params>];
  export type Partial = [Opcodes.Partial, Expression, Core.EvalInfo];
  export type DynamicArg = [Opcodes.DynamicArg, str, Expression];
  export type StaticArg = [Opcodes.StaticArg, str, Expression];
  export type TrustingAttr = [Opcodes.TrustingAttr, str, Expression, str];
  export type Debugger = [Opcodes.Debugger, Core.EvalInfo];
  export type ClientSide =
    | [Opcodes.ClientSideStatement, any]
    | [Opcodes.ClientSideStatement, any, any];

  export type Statement =
    | Text
    | Append
    | Comment
    | Modifier
    | Block
    | Component
    | DynamicComponent
    | OpenElement
    | SplatElement
    | FlushElement
    | CloseElement
    | StaticAttr
    | DynamicAttr
    | AttrSplat
    | Yield
    | Partial
    | StaticArg
    | DynamicArg
    | TrustingAttr
    | Debugger
    | ClientSide;

  export type Attribute = Statements.StaticAttr | Statements.DynamicAttr | Statements.AttrSplat;

  export type Argument = Statements.StaticArg | Statements.DynamicArg;

  export type Parameter = Attribute | Argument;
}

export type Statement = Statements.Statement;
export type Attribute = Statements.Attribute;
export type Parameter = Statements.Parameter;

export type SexpSyntax = Statement | TupleExpression;
export type Syntax = SexpSyntax | Expressions.Value;

/**
 * A JSON object of static compile time meta for the template.
 */
export interface TemplateMeta {
  [key: string]: Opaque;
  moduleName?: string;
}

/**
 * A JSON object that the Block was serialized into.
 */
export interface SerializedBlock {
  statements: Statements.Statement[];
}

export interface SerializedInlineBlock extends SerializedBlock {
  parameters: number[];
}

/**
 * A JSON object that the compiled TemplateBlock was serialized into.
 */
export interface SerializedTemplateBlock extends SerializedBlock {
  symbols: string[];
  hasEval: boolean;
}

/**
 * A JSON object that the compiled Template was serialized into.
 */
export interface SerializedTemplate<T extends TemplateMeta> {
  block: SerializedTemplateBlock;
  meta: T;
}

/**
 * A string of JSON containing a SerializedTemplateBlock
 */
export type SerializedTemplateBlockJSON = string;

/**
 * A JSON object containing the SerializedTemplateBlock as JSON and Locator.
 */
export interface SerializedTemplateWithLazyBlock<Locator> {
  id?: Option<string>;
  block: SerializedTemplateBlockJSON;
  meta: Locator;
}

/**
 * A string of Javascript containing a SerializedTemplateWithLazyBlock to be
 * concatenated into a Javascript module.
 */
export type TemplateJavascript = string;

// Statements
export const isFlushElement = is<Statements.FlushElement>(Opcodes.FlushElement);
export const isAttrSplat = is<Statements.AttrSplat>(Opcodes.AttrSplat);

export function isAttribute(val: Statement): val is Statements.Attribute {
  return (
    val[0] === Opcodes.StaticAttr ||
    val[0] === Opcodes.DynamicAttr ||
    val[0] === Opcodes.TrustingAttr
  );
}

export function isArgument(val: Statement): val is Statements.Argument {
  return val[0] === Opcodes.StaticArg || val[0] === Opcodes.DynamicArg;
}

// Expressions
export const isGet = is<Expressions.Get>(Opcodes.Get);
export const isMaybeLocal = is<Expressions.MaybeLocal>(Opcodes.MaybeLocal);

export class NamedBlocks {
  constructor(private blocks: Core.Blocks) {}

  get default(): Option<SerializedInlineBlock> {
    return this.getBlock('default');
  }

  get else(): Option<SerializedInlineBlock> {
    return this.getBlock('else');
  }

  forEach(callback: (key: string, value: SerializedInlineBlock) => void): void {
    let { blocks } = this;
    if (blocks === null || blocks === undefined) return;

    let [keys, values] = blocks;

    for (let i = 0; i < keys.length; i++) {
      callback(keys[i], values[i]);
    }
  }

  getBlock(name: string): Option<SerializedInlineBlock> {
    if (this.blocks === null || this.blocks === undefined) return null;

    let index = this.blocks[0].indexOf(name);

    if (index === -1) return null;

    return this.blocks[1][index];
  }
}
