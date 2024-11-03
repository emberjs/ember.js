import type { Dict, DictValue, Nullable, PresentArray } from '@glimmer/interfaces';
import { expect, isPresentArray } from '@glimmer/debug-util';
import { assertNever, dict } from '@glimmer/util';

export type BuilderParams = BuilderExpression[];
export type BuilderHash = Nullable<Dict<BuilderExpression>>;
export type BuilderBlockHash = BuilderHash | { as: string | string[] };
export type BuilderBlocks = Dict<BuilderBlock>;
export type BuilderAttrs = Dict<BuilderAttr>;

export type NormalizedParams = NormalizedExpression[];
export type NormalizedHash = Dict<NormalizedExpression>;
export type NormalizedBlock = NormalizedStatement[];
export type NormalizedBlocks = Dict<NormalizedBlock>;
export type NormalizedAttrs = Dict<NormalizedAttr>;
export type NormalizedAttr = HeadKinds['Splat'] | NormalizedExpression;

export interface NormalizedElement {
  name: string;
  attrs: Nullable<NormalizedAttrs>;
  block: Nullable<NormalizedBlock>;
}

export interface NormalizedAngleInvocation {
  head: NormalizedExpression;
  attrs: Nullable<NormalizedAttrs>;
  block: Nullable<NormalizedBlock>;
}

export const HeadKind = {
  Block: 'Block',
  Call: 'Call',
  Element: 'Element',
  AppendPath: 'AppendPath',
  AppendExpr: 'AppendExpr',
  Literal: 'Literal',
  Modifier: 'Modifier',
  DynamicComponent: 'DynamicComponent',
  Comment: 'Comment',
  Splat: 'Splat',
  Keyword: 'Keyword',
} as const;

export type HeadKinds = typeof HeadKind;
export type HeadKind = keyof HeadKinds;

export const VariableKind = {
  Local: 'Local',
  Free: 'Free',
  Arg: 'Arg',
  Block: 'Block',
  This: 'This',
} as const;

export type VariableKinds = typeof VariableKind;
export type VariableKind = keyof VariableKinds;

export interface Variable {
  kind: VariableKind;
  name: string;
  /**
   * Differences:
   *
   * - strict mode variables always refer to in-scope variables
   * - loose mode variables use this algorithm:
   *   1. otherwise, fall back to `this.<name>`
   */
  mode: 'loose' | 'strict';
}

export interface Path {
  head: Variable;
  tail: PresentArray<string>;
}

export interface AppendExpr {
  kind: HeadKinds['AppendExpr'];
  expr: NormalizedExpression;
  trusted: boolean;
}

export interface AppendPath {
  kind: HeadKinds['AppendPath'];
  path: NormalizedPath;
  trusted: boolean;
}

export interface NormalizedKeywordStatement {
  kind: HeadKinds['Keyword'];
  name: string;
  params: Nullable<NormalizedParams>;
  hash: Nullable<NormalizedHash>;
  blockParams: Nullable<string[]>;
  blocks: NormalizedBlocks;
}

export type NormalizedStatement =
  | {
      kind: HeadKinds['Call'];
      head: NormalizedHead;
      params: Nullable<NormalizedParams>;
      hash: Nullable<NormalizedHash>;
      trusted: boolean;
    }
  | {
      kind: HeadKinds['Block'];
      head: NormalizedHead;
      params: Nullable<NormalizedParams>;
      hash: Nullable<NormalizedHash>;
      blockParams: Nullable<string[]>;
      blocks: NormalizedBlocks;
    }
  | NormalizedKeywordStatement
  | {
      kind: HeadKinds['Element'];
      name: string;
      attrs: NormalizedAttrs;
      block: NormalizedBlock;
    }
  | { kind: HeadKinds['Comment']; value: string }
  | { kind: HeadKinds['Literal']; value: string }
  | AppendPath
  | AppendExpr
  | { kind: HeadKinds['Modifier']; params: NormalizedParams; hash: Nullable<NormalizedHash> }
  | {
      kind: HeadKinds['DynamicComponent'];
      expr: NormalizedExpression;
      hash: Nullable<NormalizedHash>;
      block: NormalizedBlock;
    };

export function normalizeStatement(statement: BuilderStatement): NormalizedStatement {
  if (Array.isArray(statement)) {
    if (statementIsExpression(statement)) {
      return normalizeAppendExpression(statement);
    } else if (isSugaryArrayStatement(statement)) {
      return normalizeSugaryArrayStatement(statement);
    } else {
      return normalizeVerboseStatement(statement);
    }
  } else if (typeof statement === 'string') {
    return normalizeAppendHead(normalizeDottedPath(statement), false);
  } else {
    throw assertNever(statement);
  }
}

export function normalizeAppendHead(
  head: NormalizedHead,
  trusted: boolean
): AppendExpr | AppendPath {
  if (head.type === ExpressionKind.GetPath) {
    return {
      kind: HeadKind.AppendPath,
      path: head,
      trusted,
    };
  } else {
    return {
      kind: HeadKind.AppendExpr,
      expr: head,
      trusted,
    };
  }
}

function isSugaryArrayStatement(statement: BuilderStatement): statement is SugaryArrayStatement {
  if (Array.isArray(statement) && typeof statement[0] === 'string') {
    switch (statement[0][0]) {
      case '(':
      case '#':
      case '<':
      case '!':
        return true;
      default:
        return false;
    }
  }

  return false;
}

export type SugaryArrayStatement = BuilderCallExpression | BuilderElement | BuilderBlockStatement;

export function normalizeSugaryArrayStatement(
  statement: SugaryArrayStatement
): NormalizedStatement {
  const name = statement[0];

  switch (name[0]) {
    case '(': {
      let params: Nullable<NormalizedParams> = null;
      let hash: Nullable<NormalizedHash> = null;

      if (statement.length === 3) {
        params = normalizeParams(statement[1] as Params);
        hash = normalizeHash(statement[2] as Hash);
      } else if (statement.length === 2) {
        if (Array.isArray(statement[1])) {
          params = normalizeParams(statement[1] as Params);
        } else {
          hash = normalizeHash(statement[1] as Hash);
        }
      }

      return {
        kind: HeadKind.Call,
        head: normalizeCallHead(name),
        params,
        hash,
        trusted: false,
      };
    }

    case '#': {
      const {
        head: path,
        params,
        hash,
        blocks,
        blockParams,
      } = normalizeBuilderBlockStatement(statement as BuilderBlockStatement);

      return {
        kind: HeadKind.Block,
        head: path,
        params,
        hash,
        blocks,
        blockParams,
      };
    }

    case '!': {
      const name = statement[0].slice(1);
      const { params, hash, blocks, blockParams } = normalizeBuilderBlockStatement(
        statement as BuilderBlockStatement
      );

      return {
        kind: HeadKind.Keyword,
        name,
        params,
        hash,
        blocks,
        blockParams,
      };
    }

    case '<': {
      let attrs: NormalizedAttrs = dict();
      let block: NormalizedBlock = [];

      if (statement.length === 3) {
        attrs = normalizeAttrs(statement[1] as BuilderAttrs);
        block = normalizeBlock(statement[2] as BuilderBlock);
      } else if (statement.length === 2) {
        if (Array.isArray(statement[1])) {
          block = normalizeBlock(statement[1] as BuilderBlock);
        } else {
          attrs = normalizeAttrs(statement[1] as BuilderAttrs);
        }
      }

      return {
        kind: HeadKind.Element,
        name: expect(extractElement(name), `BUG: expected ${name} to look like a tag name`),
        attrs,
        block,
      };
    }

    default:
      throw new Error(`Unreachable ${JSON.stringify(statement)} in normalizeSugaryArrayStatement`);
  }
}

function normalizeVerboseStatement(statement: VerboseStatement): NormalizedStatement {
  switch (statement[0]) {
    case Builder.Literal: {
      return {
        kind: HeadKind.Literal,
        value: statement[1],
      };
    }

    case Builder.Append: {
      return normalizeAppendExpression(statement[1], statement[2]);
    }

    case Builder.Modifier: {
      return {
        kind: HeadKind.Modifier,
        params: normalizeParams(statement[1]),
        hash: normalizeHash(statement[2]),
      };
    }

    case Builder.DynamicComponent: {
      return {
        kind: HeadKind.DynamicComponent,
        expr: normalizeExpression(statement[1]),
        hash: normalizeHash(statement[2]),
        block: normalizeBlock(statement[3]),
      };
    }

    case Builder.Comment: {
      return {
        kind: HeadKind.Comment,
        value: statement[1],
      };
    }
  }
}

function extractBlockHead(name: string): NormalizedHead {
  const result = /^(#|!)(.*)$/u.exec(name);

  if (result === null) {
    throw new Error(`Unexpected missing # in block head`);
  }

  return normalizeDottedPath(result[2] as string);
}

function normalizeCallHead(name: string): NormalizedHead {
  const result = /^\((.*)\)$/u.exec(name);

  if (result === null) {
    throw new Error(`Unexpected missing () in call head`);
  }

  return normalizeDottedPath(result[1] as string);
}

function normalizePath(head: string, tail: string[] = []): NormalizedHead {
  const pathHead = normalizePathHead(head);

  if (isPresentArray(tail)) {
    return {
      type: ExpressionKind.GetPath,
      path: {
        head: pathHead,
        tail,
      },
    };
  } else {
    return {
      type: ExpressionKind.GetVar,
      variable: pathHead,
    };
  }
}

function normalizeDottedPath(whole: string): NormalizedHead {
  const { kind, name: rest } = normalizePathHead(whole);

  const [name, ...tail] = rest.split('.') as [string, ...string[]];

  const variable: Variable = { kind, name, mode: 'loose' };

  if (isPresentArray(tail)) {
    return { type: ExpressionKind.GetPath, path: { head: variable, tail } };
  } else {
    return { type: ExpressionKind.GetVar, variable };
  }
}

export function normalizePathHead(whole: string): Variable {
  let kind: VariableKind;
  let name: string;

  if (/^this(?:\.|$)/u.test(whole)) {
    return {
      kind: VariableKind.This,
      name: whole,
      mode: 'loose',
    };
  }

  switch (whole[0]) {
    case '^':
      kind = VariableKind.Free;
      name = whole.slice(1);
      break;

    case '@':
      kind = VariableKind.Arg;
      name = whole.slice(1);
      break;

    case '&':
      kind = VariableKind.Block;
      name = whole.slice(1);
      break;

    default:
      kind = VariableKind.Local;
      name = whole;
  }

  return { kind, name, mode: 'loose' };
}

export type BuilderBlockStatement =
  | [string, BuilderBlock | BuilderBlocks]
  | [string, BuilderParams | BuilderBlockHash, BuilderBlock | BuilderBlocks]
  | [string, BuilderParams, BuilderBlockHash, BuilderBlock | BuilderBlocks];

export interface NormalizedBuilderBlockStatement {
  head: NormalizedHead;
  params: Nullable<NormalizedParams>;
  hash: Nullable<NormalizedHash>;
  blockParams: Nullable<string[]>;
  blocks: NormalizedBlocks;
}

export function normalizeBuilderBlockStatement(
  statement: BuilderBlockStatement
): NormalizedBuilderBlockStatement {
  const head = statement[0];
  let blocks: NormalizedBlocks = dict();
  let params: Nullable<NormalizedParams> = null;
  let hash: Nullable<NormalizedHash> = null;
  let blockParams: Nullable<string[]> = null;

  if (statement.length === 2) {
    blocks = normalizeBlocks(statement[1]);
  } else if (statement.length === 3) {
    if (Array.isArray(statement[1])) {
      params = normalizeParams(statement[1]);
    } else {
      ({ hash, blockParams } = normalizeBlockHash(statement[1]));
    }

    blocks = normalizeBlocks(statement[2]);
  } else if (statement.length === 4) {
    params = normalizeParams(statement[1]);
    ({ hash, blockParams } = normalizeBlockHash(statement[2]));
    blocks = normalizeBlocks(statement[3]);
  }

  return {
    head: extractBlockHead(head),
    params,
    hash,
    blockParams,
    blocks,
  };
}

function normalizeBlockHash(hash: BuilderBlockHash): {
  hash: Nullable<NormalizedHash>;
  blockParams: Nullable<string[]>;
} {
  if (hash === null) {
    return { hash: null, blockParams: null };
  }

  let out: Nullable<Dict<NormalizedExpression>> = null;
  let blockParams: Nullable<string[]> = null;

  entries(hash, (key, value) => {
    if (key === 'as') {
      blockParams = Array.isArray(value) ? (value as string[]) : [value as string];
    } else {
      out = out || dict();
      out[key] = normalizeExpression(value as BuilderExpression);
    }
  });

  return { hash: out, blockParams };
}

export function entries<D extends Dict>(
  dict: D,
  callback: <K extends keyof D>(key: K, value: D[K]) => void
): void {
  Object.keys(dict).forEach((key) => {
    const value = dict[key];
    callback(key, value as D[keyof D]);
  });
}

function normalizeBlocks(value: BuilderBlock | BuilderBlocks): NormalizedBlocks {
  if (Array.isArray(value)) {
    return { default: normalizeBlock(value) };
  } else {
    return mapObject(value, normalizeBlock);
  }
}

function normalizeBlock(block: BuilderBlock): NormalizedBlock {
  return block.map((s) => normalizeStatement(s));
}

function normalizeAttrs(attrs: BuilderAttrs): NormalizedAttrs {
  return mapObject(attrs, (a) => normalizeAttr(a).expr);
}

function normalizeAttr(attr: BuilderAttr): { expr: NormalizedAttr; trusted: boolean } {
  if (attr === 'splat') {
    return { expr: HeadKind.Splat, trusted: false };
  } else {
    const expr = normalizeExpression(attr);
    return { expr, trusted: false };
  }
}

function mapObject<T extends Dict<unknown>, Out>(
  object: T,
  mapper: (value: DictValue<T>, key: keyof T) => Out
): { [P in keyof T]: Out } {
  const out = dict() as { [P in keyof T]?: Out };

  Object.keys(object).forEach(<K extends keyof T>(k: K) => {
    out[k] = mapper(object[k] as DictValue<T>, k);
  });

  return out as { [P in keyof T]: Out };
}

export type BuilderElement =
  | [string]
  | [string, BuilderAttrs, BuilderBlock]
  | [string, BuilderBlock]
  | [string, BuilderAttrs];

export type BuilderComment = [Builder.Comment, string];

export type InvocationElement =
  | [string]
  | [string, BuilderAttrs, BuilderBlock]
  | [string, BuilderBlock]
  | [string, BuilderAttrs];

export function isElement(input: [string, ...unknown[]]): input is BuilderElement {
  const match = /^<([\d\-a-z][\d\-A-Za-z]*)>$/u.exec(input[0]);

  return !!match && !!match[1];
}

export function extractElement(input: string): Nullable<string> {
  const match = /^<([\d\-a-z][\d\-A-Za-z]*)>$/u.exec(input);

  return match?.[1] ?? null;
}

export function isAngleInvocation(input: [string, ...unknown[]]): input is InvocationElement {
  // TODO Paths
  const match = /^<(@[\dA-Za-z]*|[A-Z][\d\-A-Za-z]*)>$/u.exec(input[0]);

  return !!match && !!match[1];
}

export function isBlock(input: [string, ...unknown[]]): input is BuilderBlockStatement {
  // TODO Paths
  const match = /^#[\s\S]?([\dA-Za-z]*|[A-Z][\d\-A-Za-z]*)$/u.exec(input[0]);

  return !!match && !!match[1];
}

export enum Builder {
  Literal,
  Comment,
  Append,
  Modifier,
  DynamicComponent,
  Get,
  Concat,
  HasBlock,
  HasBlockParams,
}

export type VerboseStatement =
  | [Builder.Literal, string]
  | [Builder.Comment, string]
  | [Builder.Append, BuilderExpression, true]
  | [Builder.Append, BuilderExpression]
  | [Builder.Modifier, Params, Hash]
  | [Builder.DynamicComponent, BuilderExpression, Hash, BuilderBlock];

export type BuilderStatement =
  | VerboseStatement
  | SugaryArrayStatement
  | TupleBuilderExpression
  | string;

export type BuilderAttr = 'splat' | BuilderExpression;

export type TupleBuilderExpression =
  | [Builder.Literal, string | boolean | null | undefined]
  | [Builder.Get, string]
  | [Builder.Get, string, string[]]
  | [Builder.Concat, ...BuilderExpression[]]
  | [Builder.HasBlock, string]
  | [Builder.HasBlockParams, string]
  | BuilderCallExpression;

type Params = BuilderParams;
type Hash = Dict<BuilderExpression>;

export enum ExpressionKind {
  Literal = 'Literal',
  Call = 'Call',
  GetPath = 'GetPath',
  GetVar = 'GetVar',
  Concat = 'Concat',
  HasBlock = 'HasBlock',
  HasBlockParams = 'HasBlockParams',
}

export interface NormalizedCallExpression {
  type: ExpressionKind.Call;
  head: NormalizedHead;
  params: Nullable<NormalizedParams>;
  hash: Nullable<NormalizedHash>;
}

export interface NormalizedPath {
  type: ExpressionKind.GetPath;
  path: Path;
}

export interface NormalizedVar {
  type: ExpressionKind.GetVar;
  variable: Variable;
}

export type NormalizedHead = NormalizedPath | NormalizedVar;

export interface NormalizedConcat {
  type: ExpressionKind.Concat;
  params: [NormalizedExpression, ...NormalizedExpression[]];
}

export type NormalizedExpression =
  | {
      type: ExpressionKind.Literal;
      value: null | undefined | boolean | string | number;
    }
  | NormalizedCallExpression
  | NormalizedPath
  | NormalizedVar
  | NormalizedConcat
  | {
      type: ExpressionKind.HasBlock;
      name: string;
    }
  | {
      type: ExpressionKind.HasBlockParams;
      name: string;
    };

export function normalizeAppendExpression(
  expression: BuilderExpression,
  forceTrusted = false
): AppendExpr | AppendPath {
  if (expression === null || expression === undefined) {
    return {
      expr: {
        type: ExpressionKind.Literal,
        value: expression,
      },
      kind: HeadKind.AppendExpr,
      trusted: false,
    };
  } else if (Array.isArray(expression)) {
    switch (expression[0]) {
      case Builder.Literal:
        return {
          expr: { type: ExpressionKind.Literal, value: expression[1] },
          kind: HeadKind.AppendExpr,
          trusted: false,
        };

      case Builder.Get: {
        return normalizeAppendHead(normalizePath(expression[1], expression[2]), forceTrusted);
      }
      case Builder.Concat: {
        const expr: NormalizedConcat = {
          type: ExpressionKind.Concat,
          params: normalizeParams(expression.slice(1)) as [
            NormalizedExpression,
            ...NormalizedExpression[],
          ],
        };

        return {
          expr,
          kind: HeadKind.AppendExpr,
          trusted: forceTrusted,
        };
      }

      case Builder.HasBlock:
        return {
          expr: {
            type: ExpressionKind.HasBlock,
            name: expression[1],
          },
          kind: HeadKind.AppendExpr,
          trusted: forceTrusted,
        };

      case Builder.HasBlockParams:
        return {
          expr: {
            type: ExpressionKind.HasBlockParams,
            name: expression[1],
          },
          kind: HeadKind.AppendExpr,
          trusted: forceTrusted,
        };

      default: {
        if (isBuilderCallExpression(expression)) {
          return {
            expr: normalizeCallExpression(expression),
            kind: HeadKind.AppendExpr,
            trusted: forceTrusted,
          };
        } else {
          throw new Error(
            `Unexpected array in expression position (wasn't a tuple expression and ${
              expression[0] as string
            } isn't wrapped in parens, so it isn't a call): ${JSON.stringify(expression)}`
          );
        }
      }
      // BuilderCallExpression
    }
  } else if (typeof expression !== 'object') {
    switch (typeof expression) {
      case 'string': {
        return normalizeAppendHead(normalizeDottedPath(expression), forceTrusted);
      }
      case 'boolean':
      case 'number':
        return {
          expr: { type: ExpressionKind.Literal, value: expression },
          kind: HeadKind.AppendExpr,
          trusted: true,
        };

      default:
        throw assertNever(expression);
    }
  } else {
    throw assertNever(expression);
  }
}

export function normalizeExpression(expression: BuilderExpression): NormalizedExpression {
  if (expression === null || expression === undefined) {
    return {
      type: ExpressionKind.Literal,
      value: expression,
    };
  } else if (Array.isArray(expression)) {
    switch (expression[0]) {
      case Builder.Literal:
        return { type: ExpressionKind.Literal, value: expression[1] };

      case Builder.Get: {
        return normalizePath(expression[1], expression[2]);
      }
      case Builder.Concat: {
        const expr: NormalizedConcat = {
          type: ExpressionKind.Concat,
          params: normalizeParams(expression.slice(1)) as [
            NormalizedExpression,
            ...NormalizedExpression[],
          ],
        };

        return expr;
      }

      case Builder.HasBlock:
        return {
          type: ExpressionKind.HasBlock,
          name: expression[1],
        };

      case Builder.HasBlockParams:
        return {
          type: ExpressionKind.HasBlockParams,
          name: expression[1],
        };

      default: {
        if (isBuilderCallExpression(expression)) {
          return normalizeCallExpression(expression);
        } else {
          throw new Error(
            `Unexpected array in expression position (wasn't a tuple expression and ${
              expression[0] as string
            } isn't wrapped in parens, so it isn't a call): ${JSON.stringify(expression)}`
          );
        }
      }
      // BuilderCallExpression
    }
  } else if (typeof expression !== 'object') {
    switch (typeof expression) {
      case 'string': {
        return normalizeDottedPath(expression);
      }
      case 'boolean':
      case 'number':
        return { type: ExpressionKind.Literal, value: expression };

      default:
        throw assertNever(expression);
    }
  } else {
    throw assertNever(expression);
  }
}

// | [Builder.Get, string]
// | [Builder.Get, string, string[]]
// | [Builder.Concat, Params]
// | [Builder.HasBlock, string]
// | [Builder.HasBlockParams, string]

export type BuilderExpression =
  | TupleBuilderExpression
  | BuilderCallExpression
  | null
  | undefined
  | boolean
  | string
  | number;

export function isBuilderExpression(
  expr: BuilderExpression | BuilderCallExpression
): expr is TupleBuilderExpression | BuilderCallExpression {
  return Array.isArray(expr);
}

export function isLiteral(
  expr: BuilderExpression | BuilderCallExpression
): expr is [Builder.Literal, string | boolean | undefined] {
  return Array.isArray(expr) && expr[0] === 'literal';
}

export function statementIsExpression(
  statement: BuilderStatement
): statement is TupleBuilderExpression {
  if (!Array.isArray(statement)) {
    return false;
  }

  const name = statement[0];

  if (typeof name === 'number') {
    switch (name) {
      case Builder.Literal:
      case Builder.Get:
      case Builder.Concat:
      case Builder.HasBlock:
      case Builder.HasBlockParams:
        return true;
      default:
        return false;
    }
  }

  if (name[0] === '(') {
    return true;
  }

  return false;
}

export function isBuilderCallExpression(
  value: TupleBuilderExpression | BuilderCallExpression
): value is BuilderCallExpression {
  return typeof value[0] === 'string' && value[0][0] === '(';
}

export type MiniBuilderBlock = BuilderStatement[];

export type BuilderBlock = MiniBuilderBlock;

export type BuilderCallExpression = [string] | [string, Params | Hash] | [string, Params, Hash];

export function normalizeParams(input: Params): NormalizedParams {
  return input.map(normalizeExpression);
}

export function normalizeHash(input: Nullable<Hash>): Nullable<NormalizedHash> {
  if (input === null) return null;
  return mapObject(input, normalizeExpression);
}

export function normalizeCallExpression(expr: BuilderCallExpression): NormalizedCallExpression {
  switch (expr.length) {
    case 1:
      return {
        type: ExpressionKind.Call,
        head: normalizeCallHead(expr[0]),
        params: null,
        hash: null,
      };
    case 2: {
      if (Array.isArray(expr[1])) {
        return {
          type: ExpressionKind.Call,
          head: normalizeCallHead(expr[0]),
          params: normalizeParams(expr[1]),
          hash: null,
        };
      } else {
        return {
          type: ExpressionKind.Call,
          head: normalizeCallHead(expr[0]),
          params: null,
          hash: normalizeHash(expr[1]),
        };
      }
    }

    case 3:
      return {
        type: ExpressionKind.Call,
        head: normalizeCallHead(expr[0]),
        params: normalizeParams(expr[1]),
        hash: normalizeHash(expr[2]),
      };
  }
}
