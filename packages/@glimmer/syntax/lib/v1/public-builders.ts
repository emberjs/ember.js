import type { Dict, Nullable } from '@glimmer/interfaces';
import { asPresentArray, assert, deprecate, isPresentArray } from '@glimmer/debug-util';

import type { SourceLocation, SourcePosition } from '../source/location';
import type * as ASTv1 from './api';

import { isVoidTag } from '../generation/printer';
import { SYNTHETIC_LOCATION } from '../source/location';
import { Source } from '../source/source';
import { SourceSpan } from '../source/span';
import b from './parser-builders';

let _SOURCE: Source | undefined;

function SOURCE(): Source {
  if (!_SOURCE) {
    _SOURCE = new Source('', '(synthetic)');
  }

  return _SOURCE;
}

// const SOURCE = new Source('', '(tests)');

// Statements

export type BuilderHead = string | ASTv1.CallableExpression;
export type TagDescriptor =
  | string
  | ASTv1.PathExpression
  | { path: ASTv1.PathExpression; selfClosing?: boolean }
  | { name: string; selfClosing?: boolean };

function buildMustache(
  path: BuilderHead | ASTv1.Literal,
  params: ASTv1.Expression[] = [],
  hash: ASTv1.Hash = buildHash([]),
  trusting = false,
  loc?: SourceLocation,
  strip?: ASTv1.StripFlags
): ASTv1.MustacheStatement {
  return b.mustache({
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
  _elseBlock: Nullable<PossiblyDeprecatedBlock> = null,
  loc?: SourceLocation,
  openStrip?: ASTv1.StripFlags,
  inverseStrip?: ASTv1.StripFlags,
  closeStrip?: ASTv1.StripFlags
): ASTv1.BlockStatement {
  let defaultBlock: ASTv1.Block;
  let elseBlock: Nullable<ASTv1.Block> = null;

  if (_defaultBlock.type === 'Template') {
    deprecate(`b.program is deprecated. Use b.blockItself instead.`);
    defaultBlock = b.blockItself({
      params: buildBlockParams(_defaultBlock.blockParams),
      body: _defaultBlock.body,
      loc: _defaultBlock.loc,
    });
  } else {
    defaultBlock = _defaultBlock;
  }

  if (_elseBlock?.type === 'Template') {
    deprecate(`b.program is deprecated. Use b.blockItself instead.`);
    assert(_elseBlock.blockParams.length === 0, '{{else}} block cannot have block params');

    elseBlock = b.blockItself({
      params: [],
      body: _elseBlock.body,
      loc: _elseBlock.loc,
    });
  } else {
    elseBlock = _elseBlock;
  }

  return b.block({
    path: buildPath(path),
    params: params || [],
    hash: hash || buildHash([]),
    defaultBlock,
    elseBlock,
    loc: buildLoc(loc || null),
    openStrip,
    inverseStrip,
    closeStrip,
  });
}

function buildElementModifier(
  path: BuilderHead,
  params?: ASTv1.Expression[],
  hash?: ASTv1.Hash,
  loc?: Nullable<SourceLocation>
): ASTv1.ElementModifierStatement {
  return b.elementModifier({
    path: buildPath(path),
    params: params || [],
    hash: hash || buildHash([]),
    loc: buildLoc(loc || null),
  });
}

function buildComment(value: string, loc?: SourceLocation): ASTv1.CommentStatement {
  return b.comment({
    value: value,
    loc: buildLoc(loc || null),
  });
}

function buildMustacheComment(value: string, loc?: SourceLocation): ASTv1.MustacheCommentStatement {
  return b.mustacheComment({
    value: value,
    loc: buildLoc(loc || null),
  });
}

function buildConcat(
  parts: (ASTv1.TextNode | ASTv1.MustacheStatement)[],
  loc?: SourceLocation
): ASTv1.ConcatStatement {
  if (!isPresentArray(parts)) {
    throw new Error(`b.concat requires at least one part`);
  }

  return b.concat({
    parts,
    loc: buildLoc(loc || null),
  });
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
  comments?: ASTv1.MustacheCommentStatement[];
  blockParams?: ASTv1.VarHead[] | string[];
  openTag?: SourceLocation;
  closeTag?: Nullable<SourceLocation>;
  loc?: SourceLocation;
}

function buildElement(tag: TagDescriptor, options: BuildElementOptions = {}): ASTv1.ElementNode {
  let {
    attrs,
    blockParams,
    modifiers,
    comments,
    children,
    openTag,
    closeTag: _closeTag,
    loc,
  } = options;

  // this is used for backwards compat, prior to `selfClosing` being part of the ElementNode AST
  let path: ASTv1.PathExpression;
  let selfClosing: boolean | undefined;

  if (typeof tag === 'string') {
    if (tag.endsWith('/')) {
      path = buildPath(tag.slice(0, -1));
      selfClosing = true;
    } else {
      path = buildPath(tag);
    }
  } else if ('type' in tag) {
    assert(tag.type === 'PathExpression', `Invalid tag type ${tag.type}`);
    path = tag;
  } else if ('path' in tag) {
    assert(tag.path.type === 'PathExpression', `Invalid tag type ${tag.path.type}`);
    path = tag.path;
    selfClosing = tag.selfClosing;
  } else {
    path = buildPath(tag.name);
    selfClosing = tag.selfClosing;
  }

  if (selfClosing) {
    assert(
      _closeTag === null || _closeTag === undefined,
      'Cannot build a self-closing tag with a closeTag source location'
    );
  }

  let params = blockParams?.map((param) => {
    if (typeof param === 'string') {
      return buildVar(param);
    } else {
      return param;
    }
  });

  let closeTag: Nullable<SourceSpan> = null;

  if (_closeTag) {
    closeTag = buildLoc(_closeTag || null);
  } else if (_closeTag === undefined) {
    closeTag = selfClosing || isVoidTag(path.original) ? null : buildLoc(null);
  }

  return b.element({
    path,
    selfClosing: selfClosing || false,
    attributes: attrs || [],
    params: params || [],
    modifiers: modifiers || [],
    comments: comments || [],
    children: children || [],
    openTag: buildLoc(openTag || null),
    closeTag,
    loc: buildLoc(loc || null),
  });
}

function buildAttr(name: string, value: ASTv1.AttrValue, loc?: SourceLocation): ASTv1.AttrNode {
  return b.attr({
    name: name,
    value: value,
    loc: buildLoc(loc || null),
  });
}

function buildText(chars = '', loc?: SourceLocation): ASTv1.TextNode {
  return b.text({
    chars,
    loc: buildLoc(loc || null),
  });
}

// Expressions

function buildSexpr(
  path: BuilderHead,
  params: ASTv1.Expression[] = [],
  hash: ASTv1.Hash = buildHash([]),
  loc?: SourceLocation
): ASTv1.SubExpression {
  return b.sexpr({
    path: buildPath(path),
    params,
    hash,
    loc: buildLoc(loc || null),
  });
}

function buildHead(original: string, loc?: SourceLocation): ASTv1.PathExpression {
  let [head, ...tail] = asPresentArray(original.split('.'));
  let headNode = b.head({ original: head, loc: buildLoc(loc || null) });
  return b.path({ head: headNode, tail, loc: buildLoc(loc || null) });
}

function buildThis(loc?: SourceLocation): ASTv1.ThisHead {
  return b.this({ loc: buildLoc(loc || null) });
}

function buildAtName(name: string, loc?: SourceLocation): ASTv1.AtHead {
  return b.atName({ name, loc: buildLoc(loc || null) });
}

function buildVar(name: string, loc?: SourceLocation): ASTv1.VarHead {
  return b.var({ name, loc: buildLoc(loc || null) });
}

function buildHeadFromString(original: string, loc?: SourceLocation): ASTv1.PathHead {
  return b.head({ original, loc: buildLoc(loc || null) });
}

function buildCleanPath(
  head: ASTv1.PathHead,
  tail: string[] = [],
  loc?: SourceLocation
): ASTv1.PathExpression {
  return b.path({ head, tail, loc: buildLoc(loc || null) });
}

function buildPath(
  path: ASTv1.PathExpression | string | { head: string; tail: string[] },
  loc?: SourceLocation
): ASTv1.PathExpression;
function buildPath(path: BuilderHead, loc?: SourceLocation): ASTv1.CallableExpression;
function buildPath(path: BuilderHead | ASTv1.Literal, loc?: SourceLocation): ASTv1.Expression;
function buildPath(path: ASTv1.Expression, loc?: SourceLocation): ASTv1.Expression;
function buildPath(
  path: BuilderHead | ASTv1.Expression | { head: string; tail: string[] },
  loc?: SourceLocation
): ASTv1.Expression {
  let span = buildLoc(loc || null);

  if (typeof path !== 'string') {
    if ('type' in path) {
      return path;
    } else {
      assert(
        path.head.indexOf('.') === -1,
        `builder.path({ head, tail }) should not be called with a head with dots in it`
      );

      let { head, tail } = path;

      return b.path({
        head: b.head({ original: head, loc: span.sliceStartChars({ chars: head.length }) }),
        tail,
        loc: buildLoc(loc || null),
      });
    }
  }

  let { head, tail } = buildHead(path, span);

  return b.path({ head, tail, loc: span });
}

function buildLiteral<T extends ASTv1.Literal>(
  type: T['type'],
  value: T['value'],
  loc?: SourceLocation
): T {
  return b.literal({
    type,
    value,
    loc: buildLoc(loc || null),
  });
}

// Miscellaneous

function buildHash(pairs: ASTv1.HashPair[] = [], loc?: SourceLocation): ASTv1.Hash {
  return b.hash({
    pairs,
    loc: buildLoc(loc || null),
  });
}

function buildPair(key: string, value: ASTv1.Expression, loc?: SourceLocation): ASTv1.HashPair {
  return b.pair({
    key,
    value,
    loc: buildLoc(loc || null),
  });
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

function buildBlockParams(params: ReadonlyArray<ASTv1.VarHead | string>): ASTv1.VarHead[] {
  return params.map((p) =>
    typeof p === 'string' ? b.var({ name: p, loc: SourceSpan.synthetic(p) }) : p
  );
}

function buildBlockItself(
  body: ASTv1.Statement[] = [],
  params: Array<ASTv1.VarHead | string> = [],
  chained = false,
  loc?: SourceLocation
): ASTv1.Block {
  return b.blockItself({
    body,
    params: buildBlockParams(params),
    chained,
    loc: buildLoc(loc || null),
  });
}

function buildTemplate(
  body: ASTv1.Statement[] = [],
  blockParams: string[] = [],
  loc?: SourceLocation
): ASTv1.Template {
  return b.template({
    body,
    blockParams,
    loc: buildLoc(loc || null),
  });
}

function buildPosition(line: number, column: number): SourcePosition {
  return b.pos({
    line,
    column,
  });
}

function buildLoc(loc: Nullable<SourceLocation>): SourceSpan;
function buildLoc(
  startLine: number,
  startColumn: number,
  endLine?: number,
  endColumn?: number,
  source?: string
): SourceSpan;
function buildLoc(
  ...args:
    | [Nullable<SourceLocation>]
    | [
        startLine: number,
        startColumn: number,
        endLine?: number | undefined,
        endColumn?: number | undefined,
        source?: string | undefined,
      ]
): SourceSpan {
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
        line: endLine || startLine,
        column: endColumn || startColumn,
      },
    });
  }
}

export default {
  mustache: buildMustache,
  block: buildBlock,
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
