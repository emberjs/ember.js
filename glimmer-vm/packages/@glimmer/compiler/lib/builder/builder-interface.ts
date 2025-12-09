import type { VariableKind } from '@glimmer/constants';
import type { Dict, DictValue, Nullable, PresentArray } from '@glimmer/interfaces';
import {
  APPEND_EXPR_HEAD,
  APPEND_PATH_HEAD,
  ARG_VAR,
  BLOCK_HEAD,
  BLOCK_VAR,
  BUILDER_APPEND,
  BUILDER_COMMENT,
  BUILDER_CONCAT,
  BUILDER_DYNAMIC_COMPONENT,
  BUILDER_GET,
  BUILDER_HAS_BLOCK,
  BUILDER_HAS_BLOCK_PARAMS,
  BUILDER_LITERAL,
  BUILDER_MODIFIER,
  CALL_EXPR,
  CALL_HEAD,
  COMMENT_HEAD,
  CONCAT_EXPR,
  DYNAMIC_COMPONENT_HEAD,
  ELEMENT_HEAD,
  FREE_VAR,
  GET_PATH_EXPR,
  GET_VAR_EXPR,
  HAS_BLOCK_EXPR,
  HAS_BLOCK_PARAMS_EXPR,
  KEYWORD_HEAD,
  LITERAL_EXPR,
  LITERAL_HEAD,
  LOCAL_VAR,
  MODIFIER_HEAD,
  SPLAT_HEAD,
  THIS_VAR,
} from '@glimmer/constants';
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
export type NormalizedAttr = SPLAT_HEAD | NormalizedExpression;

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
  kind: APPEND_EXPR_HEAD;
  expr: NormalizedExpression;
  trusted: boolean;
}

export interface AppendPath {
  kind: APPEND_PATH_HEAD;
  path: NormalizedPath;
  trusted: boolean;
}

export interface NormalizedKeywordStatement {
  kind: KEYWORD_HEAD;
  name: string;
  params: Nullable<NormalizedParams>;
  hash: Nullable<NormalizedHash>;
  blockParams: Nullable<string[]>;
  blocks: NormalizedBlocks;
}

export type NormalizedStatement =
  | {
      kind: CALL_HEAD;
      head: NormalizedHead;
      params: Nullable<NormalizedParams>;
      hash: Nullable<NormalizedHash>;
      trusted: boolean;
    }
  | {
      kind: BLOCK_HEAD;
      head: NormalizedHead;
      params: Nullable<NormalizedParams>;
      hash: Nullable<NormalizedHash>;
      blockParams: Nullable<string[]>;
      blocks: NormalizedBlocks;
    }
  | NormalizedKeywordStatement
  | {
      kind: ELEMENT_HEAD;
      name: string;
      attrs: NormalizedAttrs;
      block: NormalizedBlock;
    }
  | { kind: COMMENT_HEAD; value: string }
  | { kind: LITERAL_HEAD; value: string }
  | AppendPath
  | AppendExpr
  | { kind: MODIFIER_HEAD; params: NormalizedParams; hash: Nullable<NormalizedHash> }
  | {
      kind: DYNAMIC_COMPONENT_HEAD;
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
    assertNever(statement);
  }
}

export function normalizeAppendHead(
  head: NormalizedHead,
  trusted: boolean
): AppendExpr | AppendPath {
  if (head.type === GET_PATH_EXPR) {
    return {
      kind: APPEND_PATH_HEAD,
      path: head,
      trusted,
    };
  } else {
    return {
      kind: APPEND_EXPR_HEAD,
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
        kind: CALL_HEAD,
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
        kind: BLOCK_HEAD,
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
        kind: KEYWORD_HEAD,
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
        kind: ELEMENT_HEAD,
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
    case BUILDER_LITERAL: {
      return {
        kind: LITERAL_HEAD,
        value: statement[1],
      };
    }

    case BUILDER_APPEND: {
      return normalizeAppendExpression(statement[1], statement[2]);
    }

    case BUILDER_MODIFIER: {
      return {
        kind: MODIFIER_HEAD,
        params: normalizeParams(statement[1]),
        hash: normalizeHash(statement[2]),
      };
    }

    case BUILDER_DYNAMIC_COMPONENT: {
      return {
        kind: DYNAMIC_COMPONENT_HEAD,
        expr: normalizeExpression(statement[1]),
        hash: normalizeHash(statement[2]),
        block: normalizeBlock(statement[3]),
      };
    }

    case BUILDER_COMMENT: {
      return {
        kind: COMMENT_HEAD,
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
      type: GET_PATH_EXPR,
      path: {
        head: pathHead,
        tail,
      },
    };
  } else {
    return {
      type: GET_VAR_EXPR,
      variable: pathHead,
    };
  }
}

function normalizeDottedPath(whole: string): NormalizedHead {
  const { kind, name: rest } = normalizePathHead(whole);

  const [name, ...tail] = rest.split('.') as [string, ...string[]];

  const variable: Variable = { kind, name, mode: 'loose' };

  if (isPresentArray(tail)) {
    return { type: GET_PATH_EXPR, path: { head: variable, tail } };
  } else {
    return { type: GET_VAR_EXPR, variable };
  }
}

export function normalizePathHead(whole: string): Variable {
  let kind: VariableKind;
  let name: string;

  if (/^this(?:\.|$)/u.test(whole)) {
    return {
      kind: THIS_VAR,
      name: whole,
      mode: 'loose',
    };
  }

  switch (whole[0]) {
    case '^':
      kind = FREE_VAR;
      name = whole.slice(1);
      break;

    case '@':
      kind = ARG_VAR;
      name = whole.slice(1);
      break;

    case '&':
      kind = BLOCK_VAR;
      name = whole.slice(1);
      break;

    default:
      kind = LOCAL_VAR;
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
  } else {
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

type Entry<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T];

export function entries<D extends Dict>(dict: D, callback: (...entry: Entry<D>) => void): void {
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
    return { expr: SPLAT_HEAD, trusted: false };
  } else {
    const expr = normalizeExpression(attr);
    return { expr, trusted: false };
  }
}

function mapObject<T extends Dict, Out>(
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

export type BuilderComment = [BUILDER_COMMENT, string];

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

export type VerboseStatement =
  | [BUILDER_LITERAL, string]
  | [BUILDER_COMMENT, string]
  | [BUILDER_APPEND, BuilderExpression, true]
  | [BUILDER_APPEND, BuilderExpression]
  | [BUILDER_MODIFIER, Params, Hash]
  | [BUILDER_DYNAMIC_COMPONENT, BuilderExpression, Hash, BuilderBlock];

export type BuilderStatement =
  | VerboseStatement
  | SugaryArrayStatement
  | TupleBuilderExpression
  | string;

/**
 * The special value 'splat' is used to indicate that the attribute is a splat
 */
export type BuilderAttr = BuilderExpression;

export type TupleBuilderExpression =
  | [BUILDER_LITERAL, string | boolean | null | undefined]
  | [BUILDER_GET, string]
  | [BUILDER_GET, string, string[]]
  | [BUILDER_CONCAT, ...BuilderExpression[]]
  | [BUILDER_HAS_BLOCK, string]
  | [BUILDER_HAS_BLOCK_PARAMS, string]
  | BuilderCallExpression;

type Params = BuilderParams;
type Hash = Dict<BuilderExpression>;

export interface NormalizedCallExpression {
  type: CALL_EXPR;
  head: NormalizedHead;
  params: Nullable<NormalizedParams>;
  hash: Nullable<NormalizedHash>;
}

export interface NormalizedPath {
  type: GET_PATH_EXPR;
  path: Path;
}

export interface NormalizedVar {
  type: GET_VAR_EXPR;
  variable: Variable;
}

export type NormalizedHead = NormalizedPath | NormalizedVar;

export interface NormalizedConcat {
  type: CONCAT_EXPR;
  params: [NormalizedExpression, ...NormalizedExpression[]];
}

export type NormalizedExpression =
  | {
      type: LITERAL_EXPR;
      value: null | undefined | boolean | string | number;
    }
  | NormalizedCallExpression
  | NormalizedPath
  | NormalizedVar
  | NormalizedConcat
  | {
      type: HAS_BLOCK_EXPR;
      name: string;
    }
  | {
      type: HAS_BLOCK_PARAMS_EXPR;
      name: string;
    };

export function normalizeAppendExpression(
  expression: BuilderExpression,
  forceTrusted = false
): AppendExpr | AppendPath {
  if (expression === null || expression === undefined) {
    return {
      expr: {
        type: LITERAL_EXPR,
        value: expression,
      },
      kind: APPEND_EXPR_HEAD,
      trusted: false,
    };
  } else if (Array.isArray(expression)) {
    switch (expression[0]) {
      case BUILDER_LITERAL:
        return {
          expr: { type: LITERAL_EXPR, value: expression[1] },
          kind: APPEND_EXPR_HEAD,
          trusted: false,
        };

      case BUILDER_GET: {
        return normalizeAppendHead(normalizePath(expression[1], expression[2]), forceTrusted);
      }
      case BUILDER_CONCAT: {
        const expr: NormalizedConcat = {
          type: CONCAT_EXPR,
          params: normalizeParams(expression.slice(1)) as [
            NormalizedExpression,
            ...NormalizedExpression[],
          ],
        };

        return {
          expr,
          kind: APPEND_EXPR_HEAD,
          trusted: forceTrusted,
        };
      }

      case BUILDER_HAS_BLOCK:
        return {
          expr: {
            type: HAS_BLOCK_EXPR,
            name: expression[1],
          },
          kind: APPEND_EXPR_HEAD,
          trusted: forceTrusted,
        };

      case BUILDER_HAS_BLOCK_PARAMS:
        return {
          expr: {
            type: HAS_BLOCK_PARAMS_EXPR,
            name: expression[1],
          },
          kind: APPEND_EXPR_HEAD,
          trusted: forceTrusted,
        };

      default: {
        if (isBuilderCallExpression(expression)) {
          return {
            expr: normalizeCallExpression(expression),
            kind: APPEND_EXPR_HEAD,
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
          expr: { type: LITERAL_EXPR, value: expression },
          kind: APPEND_EXPR_HEAD,
          trusted: true,
        };

      default:
        assertNever(expression);
    }
  } else {
    assertNever(expression);
  }
}

export function normalizeExpression(expression: BuilderExpression): NormalizedExpression {
  if (expression === null || expression === undefined) {
    return {
      type: LITERAL_EXPR,
      value: expression,
    };
  } else if (Array.isArray(expression)) {
    switch (expression[0]) {
      case BUILDER_LITERAL:
        return { type: LITERAL_EXPR, value: expression[1] };

      case BUILDER_GET: {
        return normalizePath(expression[1], expression[2]);
      }
      case BUILDER_CONCAT: {
        const expr: NormalizedConcat = {
          type: CONCAT_EXPR,
          params: normalizeParams(expression.slice(1)) as [
            NormalizedExpression,
            ...NormalizedExpression[],
          ],
        };

        return expr;
      }

      case BUILDER_HAS_BLOCK:
        return {
          type: HAS_BLOCK_EXPR,
          name: expression[1],
        };

      case BUILDER_HAS_BLOCK_PARAMS:
        return {
          type: HAS_BLOCK_PARAMS_EXPR,
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
        return { type: LITERAL_EXPR, value: expression };

      default:
        assertNever(expression);
    }
  } else {
    assertNever(expression);
  }
}

// | [GET, string]
// | [GET, string, string[]]
// | [CONCAT, Params]
// | [HAS_BLOCK, string]
// | [HAS_BLOCK_PARAMS, string]

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
): expr is [BUILDER_LITERAL, string | boolean | undefined] {
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
      case BUILDER_LITERAL:
      case BUILDER_GET:
      case BUILDER_CONCAT:
      case BUILDER_HAS_BLOCK:
      case BUILDER_HAS_BLOCK_PARAMS:
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
        type: CALL_EXPR,
        head: normalizeCallHead(expr[0]),
        params: null,
        hash: null,
      };
    case 2: {
      if (Array.isArray(expr[1])) {
        return {
          type: CALL_EXPR,
          head: normalizeCallHead(expr[0]),
          params: normalizeParams(expr[1]),
          hash: null,
        };
      } else {
        return {
          type: CALL_EXPR,
          head: normalizeCallHead(expr[0]),
          params: null,
          hash: normalizeHash(expr[1]),
        };
      }
    }

    case 3:
      return {
        type: CALL_EXPR,
        head: normalizeCallHead(expr[0]),
        params: normalizeParams(expr[1]),
        hash: normalizeHash(expr[2]),
      };
  }
}
