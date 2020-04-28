import { WireFormat, Option, Dict, Expressions, ExpressionContext } from '@glimmer/interfaces';

import Op = WireFormat.SexpOpcodes;
import { dict, assertNever, assert, values, exhausted } from '@glimmer/util';
import {
  BuilderStatement,
  BuilderComment,
  normalizeStatement,
  HeadKind,
  Path,
  Variable,
  VariableKind,
  Builder,
  NormalizedExpression,
  ExpressionKind,
  NormalizedParams,
  NormalizedHash,
  NormalizedAttrs,
  NormalizedElement,
  NormalizedStatement,
  NormalizedAngleInvocation,
  NormalizedBlocks,
} from './builder-interface';
import { AttrNamespace, Namespace } from '@simple-dom/interface';

interface Symbols {
  top: ProgramSymbols;
  freeVar(name: string): number;
  arg(name: string): number;
  block(name: string): number;
  local(name: string): number;
  this(): number;

  hasLocal(name: string): boolean;

  child(params: string[]): LocalSymbols;
}

export class ProgramSymbols implements Symbols {
  _freeVariables: string[] = [];
  _symbols: string[] = ['this'];

  top = this;

  toSymbols(): string[] {
    return this._symbols.slice(1);
  }

  toUpvars(): string[] {
    return this._freeVariables;
  }

  freeVar(name: string): number {
    return addString(this._freeVariables, name);
  }

  block(name: string): number {
    return this.symbol(name);
  }

  arg(name: string): number {
    return addString(this._symbols, name);
  }

  local(name: string): never {
    throw new Error(`No local ${name} was found. Maybe you meant ^${name}?`);
  }

  this(): number {
    return 0;
  }

  hasLocal(_name: string): false {
    return false;
  }

  // any symbol
  symbol(name: string): number {
    return addString(this._symbols, name);
  }

  child(locals: string[]): LocalSymbols {
    return new LocalSymbols(this, locals);
  }
}

class LocalSymbols implements Symbols {
  private locals: Dict<number> = dict();

  constructor(private parent: Symbols, locals: string[]) {
    for (let local of locals) {
      this.locals[local] = parent.top.symbol(local);
    }
  }

  get paramSymbols(): number[] {
    return values(this.locals);
  }

  get top(): ProgramSymbols {
    return this.parent.top;
  }

  freeVar(name: string): number {
    return this.parent.freeVar(name);
  }

  arg(name: string): number {
    return this.parent.arg(name);
  }

  block(name: string): number {
    return this.parent.block(name);
  }

  local(name: string): number {
    if (name in this.locals) {
      return this.locals[name];
    } else {
      return this.parent.local(name);
    }
  }

  this(): number {
    return this.parent.this();
  }

  hasLocal(name: string): boolean {
    if (name in this.locals) {
      return true;
    } else {
      return this.parent.hasLocal(name);
    }
  }

  child(locals: string[]): LocalSymbols {
    return new LocalSymbols(this, locals);
  }
}

function addString(array: string[], item: string): number {
  let index = array.indexOf(item);

  if (index === -1) {
    index = array.length;
    array.push(item);
    return index;
  } else {
    return index;
  }
}

export interface BuilderGetFree {
  type: 'GetFree';
  head: string;
  tail: string[];
}

function unimpl(message: string): Error {
  return new Error(`unimplemented ${message}`);
}

export function buildStatements(
  statements: BuilderStatement[],
  symbols: Symbols
): WireFormat.Statement[] {
  let out: WireFormat.Statement[] = [];

  statements.forEach(s => out.push(...buildStatement(normalizeStatement(s), symbols)));

  return out;
}

export function buildNormalizedStatements(
  statements: NormalizedStatement[],
  symbols: Symbols
): WireFormat.Statement[] {
  let out: WireFormat.Statement[] = [];

  statements.forEach(s => out.push(...buildStatement(s, symbols)));

  return out;
}

export function buildStatement(
  normalized: NormalizedStatement,
  symbols: Symbols = new ProgramSymbols()
): WireFormat.Statement[] {
  switch (normalized.kind) {
    case HeadKind.AppendPath: {
      return [
        [
          Op.Append,
          +normalized.trusted,
          buildPath(normalized.path, ExpressionContext.AppendSingleId, symbols),
        ],
      ];
    }

    case HeadKind.AppendExpr: {
      return [
        [
          Op.Append,
          +normalized.trusted,
          buildExpression(normalized.expr, ExpressionContext.Expression, symbols),
        ],
      ];
    }

    case HeadKind.Call: {
      let { path, params, hash, trusted } = normalized;
      let builtParams: Option<WireFormat.Core.Params> = params ? buildParams(params, symbols) : [];
      let builtHash: WireFormat.Core.Hash = hash ? buildHash(hash, symbols) : null;
      let builtExpr: WireFormat.Expression = buildPath(path, ExpressionContext.CallHead, symbols);

      return [[Op.Append, +trusted, [Op.Call, builtExpr, builtParams, builtHash]]];
    }

    case HeadKind.Literal: {
      return [[Op.Append, 1, normalized.value]];
    }

    case HeadKind.Comment: {
      return [[Op.Comment, normalized.value]];
    }

    case HeadKind.Block: {
      let blocks = buildBlocks(normalized.blocks, normalized.blockParams, symbols);
      let hash = buildHash(normalized.hash, symbols);
      let params = buildParams(normalized.params, symbols);
      let path = buildPath(normalized.path, ExpressionContext.BlockHead, symbols);

      return [[Op.Block, path, params, hash, blocks]];
    }

    case HeadKind.Element:
      return buildElement(normalized, symbols);

    case HeadKind.Modifier:
      throw unimpl('modifier');

    case HeadKind.DynamicComponent:
      throw unimpl('dynamic component');

    default:
      throw assertNever(normalized);
  }
}

export function s(
  arr: TemplateStringsArray,
  ...interpolated: unknown[]
): [Builder.Literal, string] {
  let result = arr.reduce(
    (result, string, i) => result + `${string}${interpolated[i] ? interpolated[i] : ''}`,
    ''
  ) as string;

  return [Builder.Literal, result];
}

export function c(arr: TemplateStringsArray, ...interpolated: unknown[]): BuilderComment {
  let result = arr.reduce(
    (result, string, i) => result + `${string}${interpolated[i] ? interpolated[i] : ''}`,
    ''
  ) as string;

  return [Builder.Comment, result];
}

export function unicode(charCode: string): string {
  return String.fromCharCode(parseInt(charCode, 16));
}

export const NEWLINE = '\n';

function buildElement(
  { name, attrs, block }: NormalizedElement,
  symbols: Symbols
): WireFormat.Statement[] {
  let out: WireFormat.Statement[] = [[Op.OpenElement, name, !hasSplat(attrs)]];
  if (attrs) {
    let { attributes, args } = buildAttrs(attrs, symbols);
    out.push(...attributes);
    assert(args === null, `Can't pass args to a simple element`);
  }
  out.push([Op.FlushElement]);

  if (Array.isArray(block)) {
    block.forEach(s => out.push(...buildStatement(s, symbols)));
  } else if (block === null) {
    // do nothing
  } else {
    throw assertNever(block);
  }

  out.push([Op.CloseElement]);

  return out;
}

function hasSplat(attrs: Option<NormalizedAttrs>): boolean {
  if (attrs === null) return false;

  return Object.keys(attrs).some(a => attrs[a] === HeadKind.Splat);
}

export function buildAngleInvocation(
  { attrs, block, head }: NormalizedAngleInvocation,
  symbols: Symbols
): WireFormat.Statements.Component {
  let attrList: WireFormat.Attribute[] = [];
  let args: WireFormat.Core.Hash = null;
  let blockList: WireFormat.Statement[] = [];

  if (attrs) {
    let built = buildAttrs(attrs, symbols);
    attrList = built.attributes;
    args = built.args;
  }

  if (block) blockList = buildNormalizedStatements(block, symbols);

  return [
    Op.Component,
    buildExpression(head, ExpressionContext.CallHead, symbols),
    attrList,
    args,
    [['default'], [{ parameters: [], statements: blockList }]],
  ];
}

export function buildAttrs(
  attrs: NormalizedAttrs,
  symbols: Symbols
): { attributes: WireFormat.Attribute[]; args: WireFormat.Core.Hash } {
  let attributes: WireFormat.Attribute[] = [];
  let keys: string[] = [];
  let values: WireFormat.Expression[] = [];

  Object.keys(attrs).forEach(key => {
    let value = attrs[key];

    if (value === HeadKind.Splat) {
      attributes.push([Op.AttrSplat, symbols.block('&attrs')]);
    } else if (key[0] === '@') {
      keys.push(key);
      values.push(buildExpression(value, ExpressionContext.Expression, symbols));
    } else {
      attributes.push(
        ...buildAttributeValue(
          key,
          value,
          // TODO: extract namespace from key
          extractNamespace(key),
          symbols
        )
      );
    }
  });

  return { attributes, args: keys.length === 0 ? null : [keys, values] };
}

export function extractNamespace(name: string): Option<AttrNamespace> {
  if (name === 'xmlns') {
    return Namespace.XMLNS;
  }

  let match = name.match(/^([^:]*):([^:]*)$/);

  if (match === null) {
    return null;
  }

  let namespace = match[1];

  switch (namespace) {
    case 'xlink':
      return Namespace.XLink;
    case 'xml':
      return Namespace.XML;
    case 'xmlns':
      return Namespace.XMLNS;
  }

  return null;
}

export function buildAttributeValue(
  name: string,
  value: NormalizedExpression,
  namespace: Option<AttrNamespace>,
  symbols: Symbols
): WireFormat.Attribute[] {
  switch (value.type) {
    case ExpressionKind.Literal: {
      let val = value.value;

      if (val === false) {
        return [];
      } else if (val === true) {
        return [[Op.StaticAttr, name, '', namespace]];
      } else if (typeof val === 'string') {
        return [[Op.StaticAttr, name, val, namespace]];
      } else {
        throw new Error(`Unexpected/unimplemented literal attribute ${JSON.stringify(val)}`);
      }
    }

    default:
      return [
        [
          Op.DynamicAttr,
          name,
          buildExpression(value, ExpressionContext.AppendSingleId, symbols),
          namespace,
        ],
      ];
  }
}

export function buildExpression(
  expr: NormalizedExpression,
  context: ExpressionContext,
  symbols: Symbols
): WireFormat.Expression {
  switch (expr.type) {
    case ExpressionKind.Get: {
      return buildPath(expr.path, context, symbols);
    }

    case ExpressionKind.Concat: {
      return [Op.Concat, buildConcat(expr.params, symbols)];
    }

    case ExpressionKind.Call: {
      let builtParams = buildParams(expr.params, symbols);
      let builtHash = buildHash(expr.hash, symbols);
      let builtExpr = buildPath(expr.path, ExpressionContext.CallHead, symbols);

      return [Op.Call, builtExpr, builtParams, builtHash];
    }

    case ExpressionKind.HasBlock: {
      return [
        Op.HasBlock,
        buildVar(
          { kind: VariableKind.Block, name: expr.name },
          ExpressionContext.Expression,
          symbols
        ),
      ];
    }

    case ExpressionKind.HasBlockParams: {
      return [
        Op.HasBlockParams,
        buildVar(
          { kind: VariableKind.Block, name: expr.name },
          ExpressionContext.Expression,
          symbols
        ),
      ];
    }

    case ExpressionKind.Literal: {
      if (expr.value === undefined) {
        return [Op.Undefined];
      } else {
        return expr.value;
      }
    }
  }
}

export function buildPath(
  path: Path,
  context: ExpressionContext,
  symbols: Symbols
): Expressions.GetPath {
  if (path.tail.length === 0) {
    return buildVar(path.variable, context, symbols, path.tail);
  } else {
    return buildVar(path.variable, ExpressionContext.Expression, symbols, path.tail);
  }
}

export function buildVar(
  head: Variable,
  context: ExpressionContext,
  symbols: Symbols,
  path: string[]
): Expressions.GetPath;
export function buildVar(
  head: Variable,
  context: ExpressionContext,
  symbols: Symbols
): Expressions.Get;
export function buildVar(
  head: Variable,
  context: ExpressionContext,
  symbols: Symbols,
  path?: string[]
): Expressions.GetPath | Expressions.Get {
  let op: Expressions.Get[0] = Op.GetSymbol;
  let sym: number;
  switch (head.kind) {
    case VariableKind.Free:
      op = expressionContextOp(context);
      sym = symbols.freeVar(head.name);
      break;
    default:
      op = Op.GetSymbol;
      sym = getSymbolForVar(head.kind, symbols, head.name);
  }
  return (path === undefined || path.length === 0 ? [op, sym] : [op, sym, path]) as
    | Expressions.Get
    | Expressions.GetPath;
}

function getSymbolForVar(
  kind: Exclude<VariableKind, VariableKind.Free>,
  symbols: Symbols,
  name: string
) {
  switch (kind) {
    case VariableKind.Arg:
      return symbols.arg(name);
    case VariableKind.Block:
      return symbols.block(name);
    case VariableKind.Local:
      return symbols.local(name);
    case VariableKind.This:
      return symbols.this();
    default:
      return exhausted(kind);
  }
}

export function expressionContextOp(context: ExpressionContext) {
  switch (context) {
    case ExpressionContext.AppendSingleId:
      return Op.GetFreeInAppendSingleId;
    case ExpressionContext.Expression:
      return Op.GetFreeInExpression;
    case ExpressionContext.CallHead:
      return Op.GetFreeInCallHead;
    case ExpressionContext.BlockHead:
      return Op.GetFreeInBlockHead;
    case ExpressionContext.ModifierHead:
      return Op.GetFreeInModifierHead;
    case ExpressionContext.ComponentHead:
      return Op.GetFreeInComponentHead;
    default:
      return exhausted(context);
  }
}

export function buildParams(
  exprs: Option<NormalizedParams>,
  symbols: Symbols
): Option<WireFormat.Core.Params> {
  if (exprs === null) return null;

  return exprs.map(e => buildExpression(e, ExpressionContext.Expression, symbols));
}

export function buildConcat(
  exprs: [NormalizedExpression, ...NormalizedExpression[]],
  symbols: Symbols
): WireFormat.Core.ConcatParams {
  return exprs.map(e =>
    buildExpression(e, ExpressionContext.AppendSingleId, symbols)
  ) as WireFormat.Core.ConcatParams;
}

export function buildHash(exprs: Option<NormalizedHash>, symbols: Symbols): WireFormat.Core.Hash {
  if (exprs === null) return null;

  let out: [string[], WireFormat.Expression[]] = [[], []];

  Object.keys(exprs).forEach(key => {
    out[0].push(key);
    out[1].push(buildExpression(exprs[key], ExpressionContext.Expression, symbols));
  });

  return out;
}

export function buildBlocks(
  blocks: NormalizedBlocks,
  blockParams: Option<string[]>,
  parent: Symbols
): WireFormat.Core.Blocks {
  let keys: string[] = [];
  let values: WireFormat.SerializedInlineBlock[] = [];

  Object.keys(blocks).forEach(name => {
    keys.push(name);

    if (name === 'default') {
      let symbols = parent.child(blockParams || []);

      values.push({
        parameters: symbols.paramSymbols,
        statements: buildNormalizedStatements(blocks[name], symbols),
      });
    } else {
      values.push({
        parameters: [],
        statements: buildNormalizedStatements(blocks[name], parent),
      });
    }
  });

  return [keys, values];
}
