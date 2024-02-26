import type { Dict, Nullable } from '@glimmer/interfaces';
import { asPresentArray, assert, assign, deprecate, isPresentArray } from '@glimmer/util';

import type { SourceLocation, SourcePosition } from '../source/location';
import type * as ASTv1 from './api';

import { SYNTHETIC_LOCATION } from '../source/location';
import { Source } from '../source/source';
import { SourceSpan } from '../source/span';
import { buildLegacyMustache, buildLegacyPath, buildLegacyTemplate } from './legacy-interop';

let _SOURCE: Source | undefined;

function SOURCE(): Source {
  if (!_SOURCE) {
    _SOURCE = new Source('', '(synthetic)');
  }

  return _SOURCE;
}

// const SOURCE = new Source('', '(tests)');

// Statements

export type BuilderHead = string | ASTv1.Expression;
export type TagDescriptor = string | { name: string; selfClosing: boolean };

function buildMustache(
  path: BuilderHead | ASTv1.Literal,
  params: ASTv1.Expression[] = [],
  hash: ASTv1.Hash = buildHash([]),
  trusting = false,
  loc?: SourceLocation,
  strip: ASTv1.StripFlags = { open: false, close: false }
): ASTv1.MustacheStatement {
  return buildLegacyMustache({
    path: buildPath(path),
    params,
    hash,
    trusting,
    strip,
    loc: buildLoc(loc || null),
  });
}

type PossiblyDeprecatedBlock = ASTv1.Block | ASTv1.Template;

function buildBlock(
  path: BuilderHead,
  params: Nullable<ASTv1.Expression[]>,
  hash: Nullable<ASTv1.Hash>,
  _defaultBlock: PossiblyDeprecatedBlock,
  _elseBlock?: Nullable<PossiblyDeprecatedBlock>,
  loc?: SourceLocation,
  openStrip?: ASTv1.StripFlags,
  inverseStrip?: ASTv1.StripFlags,
  closeStrip?: ASTv1.StripFlags
): ASTv1.BlockStatement {
  let defaultBlock: ASTv1.Block;
  let elseBlock: Nullable<ASTv1.Block> | undefined;

  if (_defaultBlock.type === 'Template') {
    deprecate(`b.program is deprecated. Use b.blockItself instead.`);

    defaultBlock = assign({}, _defaultBlock, { type: 'Block' }) as unknown as ASTv1.Block;
  } else {
    defaultBlock = _defaultBlock;
  }

  if (_elseBlock !== undefined && _elseBlock !== null && _elseBlock.type === 'Template') {
    deprecate(`b.program is deprecated. Use b.blockItself instead.`);

    elseBlock = assign({}, _elseBlock, { type: 'Block' }) as unknown as ASTv1.Block;
  } else {
    elseBlock = _elseBlock;
  }

  return {
    type: 'BlockStatement',
    path: buildPath(path),
    params: params || [],
    hash: hash || buildHash([]),
    program: defaultBlock || null,
    inverse: elseBlock || null,
    loc: buildLoc(loc || null),
    openStrip: openStrip || { open: false, close: false },
    inverseStrip: inverseStrip || { open: false, close: false },
    closeStrip: closeStrip || { open: false, close: false },
  };
}

function buildElementModifier(
  path: BuilderHead | ASTv1.Expression,
  params?: ASTv1.Expression[],
  hash?: ASTv1.Hash,
  loc?: Nullable<SourceLocation>
): ASTv1.ElementModifierStatement {
  return {
    type: 'ElementModifierStatement',
    path: buildPath(path),
    params: params || [],
    hash: hash || buildHash([]),
    loc: buildLoc(loc || null),
  };
}

function buildPartial(
  name: ASTv1.PathExpression,
  params?: ASTv1.Expression[],
  hash?: ASTv1.Hash,
  indent?: string,
  loc?: SourceLocation
): ASTv1.PartialStatement {
  return {
    type: 'PartialStatement',
    name: name,
    params: params || [],
    hash: hash || buildHash([]),
    indent: indent || '',
    strip: { open: false, close: false },
    loc: buildLoc(loc || null),
  };
}

function buildComment(value: string, loc?: SourceLocation): ASTv1.CommentStatement {
  return {
    type: 'CommentStatement',
    value: value,
    loc: buildLoc(loc || null),
  };
}

function buildMustacheComment(value: string, loc?: SourceLocation): ASTv1.MustacheCommentStatement {
  return {
    type: 'MustacheCommentStatement',
    value: value,
    loc: buildLoc(loc || null),
  };
}

function buildConcat(
  parts: (ASTv1.TextNode | ASTv1.MustacheStatement)[],
  loc?: SourceLocation
): ASTv1.ConcatStatement {
  if (!isPresentArray(parts)) {
    throw new Error(`b.concat requires at least one part`);
  }

  return {
    type: 'ConcatStatement',
    parts: parts || [],
    loc: buildLoc(loc || null),
  };
}

// Nodes

export type ElementParts =
  | ['attrs', ...AttrSexp[]]
  | ['modifiers', ...ModifierSexp[]]
  | ['body', ...ASTv1.Statement[]]
  | ['comments', ...ElementComment[]]
  | ['as', ...string[]]
  | ['loc', SourceLocation];

export type PathSexp = string | ['path', string, LocSexp?];

export type ModifierSexp =
  | string
  | [PathSexp, LocSexp?]
  | [PathSexp, ASTv1.Expression[], LocSexp?]
  | [PathSexp, ASTv1.Expression[], Dict<ASTv1.Expression>, LocSexp?];

export type AttrSexp = [string, ASTv1.AttrNode['value'] | string, LocSexp?];

export type LocSexp = ['loc', SourceLocation];

export type ElementComment = ASTv1.MustacheCommentStatement | SourceLocation | string;

export type SexpValue =
  | string
  | ASTv1.Expression[]
  | Dict<ASTv1.Expression>
  | LocSexp
  | PathSexp
  | undefined;

export interface BuildElementOptions {
  attrs?: ASTv1.AttrNode[];
  modifiers?: ASTv1.ElementModifierStatement[];
  children?: ASTv1.Statement[];
  comments?: ElementComment[];
  blockParams?: string[];
  loc?: SourceSpan;
}

function buildElement(tag: TagDescriptor, options: BuildElementOptions = {}): ASTv1.ElementNode {
  let { attrs, blockParams, modifiers, comments, children, loc } = options;

  let tagName: string;

  // this is used for backwards compat, prior to `selfClosing` being part of the ElementNode AST
  let selfClosing = false;
  if (typeof tag === 'object') {
    selfClosing = tag.selfClosing;
    tagName = tag.name;
  } else if (tag.slice(-1) === '/') {
    tagName = tag.slice(0, -1);
    selfClosing = true;
  } else {
    tagName = tag;
  }

  return {
    type: 'ElementNode',
    tag: tagName,
    nameNode: {
      type: 'ElementNameNode',
      value: tag,
    } as ASTv1.ElementNameNode,
    startTag: {
      type: 'ElementStartNode',
      value: tag,
    } as ASTv1.ElementStartNode,
    endTag: {
      type: 'ElementEndNode',
      value: selfClosing ? '' : tag,
    } as ASTv1.ElementEndNode,
    parts: tagName
      .split('.')
      .map((t) => ({ type: 'ElementPartNode', value: t }) as ASTv1.ElementPartNode),
    selfClosing: selfClosing,
    attributes: attrs || [],
    blockParams: blockParams || [],
    blockParamNodes:
      blockParams?.map((x) => ({ type: 'BlockParam', value: x }) as ASTv1.BlockParam) || [],
    modifiers: modifiers || [],
    comments: (comments as ASTv1.MustacheCommentStatement[]) || [],
    children: children || [],
    loc: buildLoc(loc || null),
  };
}

function buildAttr(
  name: string,
  value: ASTv1.AttrNode['value'],
  loc?: SourceLocation
): ASTv1.AttrNode {
  return {
    type: 'AttrNode',
    name: name,
    value: value,
    loc: buildLoc(loc || null),
  };
}

function buildText(chars?: string, loc?: SourceLocation): ASTv1.TextNode {
  return {
    type: 'TextNode',
    chars: chars || '',
    loc: buildLoc(loc || null),
  };
}

// Expressions

function buildSexpr(
  path: BuilderHead,
  params?: ASTv1.Expression[],
  hash?: ASTv1.Hash,
  loc?: SourceLocation
): ASTv1.SubExpression {
  return {
    type: 'SubExpression',
    path: buildPath(path),
    params: params || [],
    hash: hash || buildHash([]),
    loc: buildLoc(loc || null),
  };
}

function buildHead(
  original: string,
  loc: SourceLocation
): { head: ASTv1.PathHead; tail: string[] } {
  let [head, ...tail] = asPresentArray(original.split('.'));
  let headNode: ASTv1.PathHead;

  if (head === 'this') {
    headNode = {
      type: 'ThisHead',
      loc: buildLoc(loc || null),
    };
  } else if (head[0] === '@') {
    headNode = {
      type: 'AtHead',
      name: head,
      loc: buildLoc(loc || null),
    };
  } else {
    headNode = {
      type: 'VarHead',
      name: head,
      loc: buildLoc(loc || null),
    };
  }

  return {
    head: headNode,
    tail,
  };
}

function buildThis(loc: SourceLocation): ASTv1.PathHead {
  return {
    type: 'ThisHead',
    loc: buildLoc(loc || null),
  };
}

function buildAtName(name: string, loc: SourceLocation): ASTv1.PathHead {
  // the `@` should be included so we have a complete source range
  assert(name[0] === '@', `call builders.at() with a string that starts with '@'`);

  return {
    type: 'AtHead',
    name,
    loc: buildLoc(loc || null),
  };
}

function buildVar(name: string, loc: SourceLocation): ASTv1.PathHead {
  assert(name !== 'this', `You called builders.var() with 'this'. Call builders.this instead`);
  assert(
    name[0] !== '@',
    `You called builders.var() with '${name}'. Call builders.at('${name}') instead`
  );

  return {
    type: 'VarHead',
    name,
    loc: buildLoc(loc || null),
  };
}

function buildHeadFromString(head: string, loc: SourceLocation): ASTv1.PathHead {
  if (head[0] === '@') {
    return buildAtName(head, loc);
  } else if (head === 'this') {
    return buildThis(loc);
  } else {
    return buildVar(head, loc);
  }
}

function buildCleanPath(
  head: ASTv1.PathHead,
  tail: string[],
  loc: SourceLocation
): ASTv1.PathExpression {
  return buildLegacyPath({ head, tail, loc: buildLoc(loc || null) });
}

function buildPath(
  path: ASTv1.PathExpression | string | { head: string; tail: string[] },
  loc?: SourceLocation
): ASTv1.PathExpression;
function buildPath(path: ASTv1.Expression, loc?: SourceLocation): ASTv1.Expression;
function buildPath(path: BuilderHead | ASTv1.Expression, loc?: SourceLocation): ASTv1.Expression;
function buildPath(
  path: BuilderHead | ASTv1.Expression | { head: string; tail: string[] },
  loc?: SourceLocation
): ASTv1.Expression {
  if (typeof path !== 'string') {
    if ('type' in path) {
      return path;
    } else {
      let { head, tail } = buildHead(path.head, SourceSpan.broken());

      assert(
        tail.length === 0,
        `builder.path({ head, tail }) should not be called with a head with dots in it`
      );

      return buildLegacyPath({ head, tail, loc: buildLoc(loc || null) });
    }
  }

  let { head, tail } = buildHead(path, SourceSpan.broken());

  return buildLegacyPath({ head, tail, loc: buildLoc(loc || null) });
}

function buildLiteral<T extends ASTv1.Literal>(
  type: T['type'],
  value: T['value'],
  loc?: SourceLocation
): T {
  return {
    type,
    value,
    original: value,
    loc: buildLoc(loc || null),
  } as T;
}

// Miscellaneous

function buildHash(pairs?: ASTv1.HashPair[], loc?: SourceLocation): ASTv1.Hash {
  return {
    type: 'Hash',
    pairs: pairs || [],
    loc: buildLoc(loc || null),
  };
}

function buildPair(key: string, value: ASTv1.Expression, loc?: SourceLocation): ASTv1.HashPair {
  return {
    type: 'HashPair',
    key: key,
    value,
    loc: buildLoc(loc || null),
  };
}

function buildProgram(
  body?: ASTv1.Statement[],
  blockParams?: string[],
  loc?: SourceLocation
): ASTv1.Template | ASTv1.Block {
  deprecate(`b.program is deprecated. Use b.template or b.blockItself instead.`);

  if (blockParams && blockParams.length) {
    return buildBlockItself(body, blockParams, false, loc);
  } else {
    return buildTemplate(body, [], loc);
  }
}

function buildBlockItself(
  body?: ASTv1.Statement[],
  blockParams?: string[],
  chained = false,
  loc?: SourceLocation
): ASTv1.Block {
  return {
    type: 'Block',
    body: body || [],
    blockParams: blockParams || [],
    blockParamNodes:
      blockParams?.map((b) => ({ type: 'BlockParam', value: b }) as ASTv1.BlockParam) || [],
    chained,
    loc: buildLoc(loc || null),
  };
}

function buildTemplate(
  body: ASTv1.Statement[] = [],
  locals: string[] = [],
  loc?: SourceLocation
): ASTv1.Template {
  return buildLegacyTemplate({
    body,
    locals,
    loc: buildLoc(loc || null),
  });
}

function buildPosition(line: number, column: number): SourcePosition {
  return {
    line,
    column,
  };
}

function buildLoc(loc: Nullable<SourceLocation>): SourceSpan;
function buildLoc(
  startLine: number,
  startColumn: number,
  endLine?: number,
  endColumn?: number,
  source?: string
): SourceSpan;

function buildLoc(...args: any[]): SourceSpan {
  if (args.length === 1) {
    let loc = args[0];

    if (loc && typeof loc === 'object') {
      return SourceSpan.forHbsLoc(SOURCE(), loc);
    } else {
      return SourceSpan.forHbsLoc(SOURCE(), SYNTHETIC_LOCATION);
    }
  } else {
    let [startLine, startColumn, endLine, endColumn, _source] = args;
    let source = _source ? new Source('', _source) : SOURCE();

    return SourceSpan.forHbsLoc(source, {
      start: {
        line: startLine,
        column: startColumn,
      },
      end: {
        line: endLine,
        column: endColumn,
      },
    });
  }
}

export default {
  mustache: buildMustache,
  block: buildBlock,
  partial: buildPartial,
  comment: buildComment,
  mustacheComment: buildMustacheComment,
  element: buildElement,
  elementModifier: buildElementModifier,
  attr: buildAttr,
  text: buildText,
  sexpr: buildSexpr,

  concat: buildConcat,
  hash: buildHash,
  pair: buildPair,
  literal: buildLiteral,
  program: buildProgram,
  blockItself: buildBlockItself,
  template: buildTemplate,
  loc: buildLoc,
  pos: buildPosition,

  path: buildPath,

  fullPath: buildCleanPath,
  head: buildHeadFromString,
  at: buildAtName,
  var: buildVar,
  this: buildThis,

  string: literal('StringLiteral') as (value: string) => ASTv1.StringLiteral,
  boolean: literal('BooleanLiteral') as (value: boolean) => ASTv1.BooleanLiteral,
  number: literal('NumberLiteral') as (value: number) => ASTv1.NumberLiteral,
  undefined(): ASTv1.UndefinedLiteral {
    return buildLiteral('UndefinedLiteral', undefined);
  },
  null(): ASTv1.NullLiteral {
    return buildLiteral('NullLiteral', null);
  },
};

type BuildLiteral<T extends ASTv1.Literal> = (value: T['value']) => T;

function literal<T extends ASTv1.Literal>(type: T['type']): BuildLiteral<T> {
  return function (value: T['value'], loc?: SourceLocation): T {
    return buildLiteral(type, value, loc);
  };
}
