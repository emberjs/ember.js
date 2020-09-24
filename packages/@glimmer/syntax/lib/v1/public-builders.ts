import { Dict, Option } from '@glimmer/interfaces';
import { LOCAL_DEBUG } from '@glimmer/local-debug-flags';
import { assert, assign, deprecate, isPresent } from '@glimmer/util';

import { SourceLocation, SourcePosition, SYNTHETIC_LOCATION } from '../source/location';
import { Source } from '../source/source';
import { SourceSpan } from '../source/span';
import * as ASTv1 from './api';
import { PathExpressionImplV1 } from './legacy-interop';

let _SOURCE: Source | undefined;

function SOURCE(): Source {
  if (!_SOURCE) {
    _SOURCE = new Source('', '(tests)');
  }

  return _SOURCE;
}

// const SOURCE = new Source('', '(tests)');

// Statements

export type BuilderHead = string | ASTv1.PathExpression;
export type TagDescriptor = string | { name: string; selfClosing: boolean };

function buildMustache(
  path: BuilderHead | ASTv1.Literal,
  params?: ASTv1.Expression[],
  hash?: ASTv1.Hash,
  raw?: boolean,
  loc?: SourceLocation,
  strip?: ASTv1.StripFlags
): ASTv1.MustacheStatement {
  if (typeof path === 'string') {
    path = buildPath(path);
  }

  return {
    type: 'MustacheStatement',
    path,
    params: params || [],
    hash: hash || buildHash([]),
    escaped: !raw,
    trusting: !!raw,
    loc: buildLoc(loc || null),
    strip: strip || { open: false, close: false },
  };
}

function buildBlock(
  path: BuilderHead,
  params: Option<ASTv1.Expression[]>,
  hash: Option<ASTv1.Hash>,
  _defaultBlock: ASTv1.PossiblyDeprecatedBlock,
  _elseBlock?: Option<ASTv1.PossiblyDeprecatedBlock>,
  loc?: SourceLocation,
  openStrip?: ASTv1.StripFlags,
  inverseStrip?: ASTv1.StripFlags,
  closeStrip?: ASTv1.StripFlags
): ASTv1.BlockStatement {
  let defaultBlock: ASTv1.Block;
  let elseBlock: Option<ASTv1.Block> | undefined;

  if (_defaultBlock.type === 'Template') {
    if (LOCAL_DEBUG) {
      deprecate(`b.program is deprecated. Use b.blockItself instead.`);
    }

    defaultBlock = (assign({}, _defaultBlock, { type: 'Block' }) as unknown) as ASTv1.Block;
  } else {
    defaultBlock = _defaultBlock;
  }

  if (_elseBlock !== undefined && _elseBlock !== null && _elseBlock.type === 'Template') {
    if (LOCAL_DEBUG) {
      deprecate(`b.program is deprecated. Use b.blockItself instead.`);
    }

    elseBlock = (assign({}, _elseBlock, { type: 'Block' }) as unknown) as ASTv1.Block;
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
  loc?: Option<SourceLocation>
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
  if (!isPresent(parts)) {
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
  loc: SourceSpan;
}

function buildElement(tag: TagDescriptor, options: BuildElementOptions): ASTv1.ElementNode {
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
    selfClosing: selfClosing,
    attributes: attrs || [],
    blockParams: blockParams || [],
    modifiers: modifiers || [],
    comments: (comments as ASTv1.MustacheCommentStatement[]) || [],
    children: children || [],
    loc,
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

function headToString(head: ASTv1.PathHead): { original: string; parts: string[] } {
  switch (head.type) {
    case 'AtHead':
      return { original: head.name, parts: [head.name] };
    case 'ThisHead':
      return { original: `this`, parts: [] };
    case 'VarHead':
      return { original: head.name, parts: [head.name] };
  }
}

function buildHead(
  original: string,
  loc: SourceLocation
): { head: ASTv1.PathHead; tail: string[] } {
  let [head, ...tail] = original.split('.');
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

function buildNamedBlockName(name: string, loc?: SourceLocation): ASTv1.NamedBlockName {
  return {
    type: 'NamedBlockName',
    name,
    loc: buildLoc(loc || null),
  };
}

function buildCleanPath(
  head: ASTv1.PathHead,
  tail: string[],
  loc: SourceLocation
): ASTv1.PathExpression {
  let { original: originalHead, parts: headParts } = headToString(head);
  let parts = [...headParts, ...tail];
  let original = [...originalHead, ...parts].join('.');

  return new PathExpressionImplV1(original, head, tail, buildLoc(loc || null));
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

      let { original: originalHead } = headToString(head);

      return new PathExpressionImplV1(
        [originalHead, ...tail].join('.'),
        head,
        tail,
        buildLoc(loc || null)
      );
    }
  }

  let { head, tail } = buildHead(path, SourceSpan.broken());

  return new PathExpressionImplV1(path, head, tail, buildLoc(loc || null));
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
): ASTv1.Template {
  return {
    type: 'Template',
    body: body || [],
    blockParams: blockParams || [],
    loc: buildLoc(loc || null),
  };
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
    chained,
    loc: buildLoc(loc || null),
  };
}

function buildTemplate(
  body?: ASTv1.Statement[],
  blockParams?: string[],
  loc?: SourceLocation
): ASTv1.Template {
  return {
    type: 'Template',
    body: body || [],
    blockParams: blockParams || [],
    loc: buildLoc(loc || null),
  };
}

function buildPosition(line: number, column: number): SourcePosition {
  return {
    line,
    column,
  };
}

function buildLoc(loc: Option<SourceLocation>): SourceSpan;
function buildLoc(
  startLine: number,
  startColumn: number,
  endLine?: number,
  endColumn?: number
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
    let [startLine, startColumn, endLine, endColumn] = args;
    return SourceSpan.forHbsLoc(SOURCE(), {
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
  blockName: buildNamedBlockName,

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
