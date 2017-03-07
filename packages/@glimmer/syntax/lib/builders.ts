import * as AST from './types/nodes';
import { Option } from '@glimmer/interfaces';

// Statements

export type BuilderPath = string | AST.PathExpression;

function buildMustache(path: BuilderPath | AST.Literal, params?: AST.Expression[], hash?: AST.Hash, raw?: boolean, loc?: AST.SourceLocation): AST.MustacheStatement {
  if (!AST.isLiteral(path)) {
    path = buildPath(path);
  }

  return {
    type: "MustacheStatement",
    path,
    params: params || [],
    hash: hash || buildHash([]),
    escaped: !raw,
    loc: buildLoc(loc || null)
  };
}

function buildBlock(path: BuilderPath, params: Option<AST.Expression[]>, hash: Option<AST.Hash>, program: AST.Program, inverse?: Option<AST.Program>, loc?: AST.SourceLocation): AST.BlockStatement {
  return {
    type: "BlockStatement",
    path: buildPath(path),
    params: params || [],
    hash: hash || buildHash([]),
    program: program || null,
    inverse: inverse || null,
    loc: buildLoc(loc || null)
  };
}

function buildElementModifier(path: BuilderPath, params?: AST.Expression[], hash?: AST.Hash, loc?: Option<AST.SourceLocation>): AST.ElementModifierStatement {
  return {
    type: "ElementModifierStatement",
    path: buildPath(path),
    params: params || [],
    hash: hash || buildHash([]),
    loc: buildLoc(loc || null)
  };
}

function buildPartial(name: AST.PathExpression, params?: AST.Expression[], hash?: AST.Hash, indent?: string, loc?: AST.SourceLocation): AST.PartialStatement {
  return {
    type: "PartialStatement",
    name: name,
    params: params || [],
    hash: hash || buildHash([]),
    indent: indent || '',
    strip: { open: false, close: false },
    loc: buildLoc(loc || null)
  };
}

function buildComment(value: string, loc?: AST.SourceLocation): AST.CommentStatement {
  return {
    type: "CommentStatement",
    value: value,
    loc: buildLoc(loc || null)
  };
}

function buildMustacheComment(value: string, loc?: AST.SourceLocation): AST.MustacheCommentStatement {
  return {
    type: "MustacheCommentStatement",
    value: value,
    loc: buildLoc(loc || null)
  };
}

function buildConcat(parts: (AST.TextNode | AST.MustacheStatement)[], loc?: AST.SourceLocation): AST.ConcatStatement {
  return {
    type: "ConcatStatement",
    parts: parts || [],
    loc: buildLoc(loc || null)
  };
}

// Nodes

function buildElement(tag: string, attributes?: AST.AttrNode[], modifiers?: AST.ElementModifierStatement[], children?: AST.Statement[], loc?: AST.SourceLocation): AST.ElementNode;
function buildElement(tag: string, attributes?: AST.AttrNode[], modifiers?: AST.ElementModifierStatement[], children?: AST.Statement[], comments?: AST.MustacheCommentStatement[], loc?: AST.SourceLocation): AST.ElementNode;

function buildElement(tag: string, attributes?: AST.AttrNode[], modifiers?: AST.ElementModifierStatement[], children?: AST.Statement[], comments?: AST.MustacheCommentStatement[] | AST.SourceLocation, loc?: AST.SourceLocation): AST.ElementNode {
  // this is used for backwards compat prior to `comments` being added to the AST
  if (!Array.isArray(comments)) {
    loc = comments;
    comments = [];
  }

  return {
    type: "ElementNode",
    tag: tag || "",
    attributes: attributes || [],
    blockParams: [],
    modifiers: modifiers || [],
    comments: comments || [],
    children: children || [],
    loc: buildLoc(loc || null)
  };
}

function buildAttr(name: string, value: AST.AttrNode['value'], loc?: AST.SourceLocation): AST.AttrNode {
  return {
    type: "AttrNode",
    name: name,
    value: value,
    loc: buildLoc(loc || null)
  };
}

function buildText(chars?: string, loc?: AST.SourceLocation): AST.TextNode {
  return {
    type: "TextNode",
    chars: chars || "",
    loc: buildLoc(loc || null)
  };
}

// Expressions

function buildSexpr(path: AST.PathExpression, params?: AST.Expression[], hash?: AST.Hash, loc?: AST.SourceLocation): AST.SubExpression {
  return {
    type: "SubExpression",
    path: buildPath(path),
    params: params || [],
    hash: hash || buildHash([]),
    loc: buildLoc(loc || null)
  };
}

function buildPath(original: BuilderPath, loc?: AST.SourceLocation): AST.PathExpression {
  if (typeof original !== 'string') return original;

  let parts = original.split('.');
  let thisHead = false;

  if (parts[0] === 'this') {
    thisHead = true;
    parts = parts.slice(1);
  }

  return {
    type: "PathExpression",
    original,
    this: thisHead,
    parts,
    data: false,
    loc: buildLoc(loc || null)
  };
}

function buildLiteral<T extends AST.Literal>(type: T['type'], value: T['value'], loc?: AST.SourceLocation): AST.Literal {
  return {
    type,
    value,
    original: value,
    loc: buildLoc(loc || null)
  } as AST.Literal;
}

// Miscellaneous

function buildHash(pairs?: AST.HashPair[], loc?: AST.SourceLocation): AST.Hash {
  return {
    type: "Hash",
    pairs: pairs || [],
    loc: buildLoc(loc || null)
  };
}

function buildPair(key: string, value: AST.Expression, loc?: AST.SourceLocation): AST.HashPair {
  return {
    type: "HashPair",
    key: key,
    value,
    loc: buildLoc(loc || null)
  };
}

function buildProgram(body?: AST.Statement[], blockParams?: string[], loc?: AST.SourceLocation): AST.Program {
  return {
    type: "Program",
    body: body || [],
    blockParams: blockParams || [],
    loc: buildLoc(loc || null)
  };
}

function buildSource(source?: string) {
  return source || null;
}

function buildPosition(line: number, column: number) {
  return {
    line,
    column
  };
}

export const SYNTHETIC: AST.SourceLocation = { source: '(synthetic)', start: { line: 1, column: 0 }, end: { line: 1, column: 0 } };

function buildLoc(loc:Option<AST.SourceLocation>): AST.SourceLocation;
function buildLoc(startLine: number, startColumn: number, endLine?: number, endColumn?: number, source?: string): AST.SourceLocation;

function buildLoc(...args: any[]): AST.SourceLocation {
  if (args.length === 1) {
    let loc = args[0];

    if (loc && typeof loc === 'object') {
      return {
        source: buildSource(loc.source),
        start: buildPosition(loc.start.line, loc.start.column),
        end: buildPosition(loc.end.line, loc.end.column)
      };
    } else {
      return SYNTHETIC;
    }
  } else {
    let [ startLine, startColumn, endLine, endColumn, source ] = args;
    return {
      source: buildSource(source),
      start: buildPosition(startLine, startColumn),
      end: buildPosition(endLine, endColumn)
    };
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
  path: buildPath,
  concat: buildConcat,
  hash: buildHash,
  pair: buildPair,
  literal: buildLiteral,
  program: buildProgram,
  loc: buildLoc,
  pos: buildPosition,

  string: literal('StringLiteral'),
  boolean: literal('BooleanLiteral'),
  number: literal('NumberLiteral'),
  undefined() { return buildLiteral('UndefinedLiteral', undefined); },
  null() { return buildLiteral('NullLiteral', null); }
};

function literal<T extends AST.Literal>(type: T['type']) {
  return function(value: T['value']) {
    return buildLiteral(type, value);
  };
}
