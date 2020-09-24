import { Dict, Option, PresentArray } from '@glimmer/interfaces';
import { assert } from '@glimmer/util';

import { ParserNodeBuilder } from '../parser';
import { SourceLocation } from '../source/location';
import { SourceOffset, SourceSpan } from '../source/span';
import * as ASTv1 from './api';
import { PathExpressionImplV1 } from './legacy-interop';

const DEFAULT_STRIP = {
  close: false,
  open: false,
};

/**
 * The Parser Builder differentiates from the public builder API by:
 *
 * 1. Offering fewer different ways to instantiate nodes
 * 2. Mandating source locations
 */
class Builders {
  pos(line: number, column: number) {
    return {
      line,
      column,
    };
  }

  blockItself({
    body,
    blockParams,
    chained = false,
    loc,
  }: {
    body?: ASTv1.Statement[];
    blockParams?: string[];
    chained?: boolean;
    loc: SourceSpan;
  }): ASTv1.Block {
    return {
      type: 'Block',
      body: body || [],
      blockParams: blockParams || [],
      chained,
      loc,
    };
  }

  template({
    body,
    blockParams,
    loc,
  }: {
    body?: ASTv1.Statement[];
    blockParams?: string[];
    loc: SourceSpan;
  }): ASTv1.Template {
    return {
      type: 'Template',
      body: body || [],
      blockParams: blockParams || [],
      loc,
    };
  }

  mustache({
    path,
    params,
    hash,
    trusting,
    loc,
    strip = DEFAULT_STRIP,
  }: {
    path: ASTv1.Expression;
    params: ASTv1.Expression[];
    hash: ASTv1.Hash;
    trusting: boolean;
    loc: SourceSpan;
    strip: ASTv1.StripFlags;
  }): ASTv1.MustacheStatement {
    return {
      type: 'MustacheStatement',
      path,
      params,
      hash,
      escaped: !trusting,
      trusting,
      loc,
      strip: strip || { open: false, close: false },
    };
  }

  block({
    path,
    params,
    hash,
    defaultBlock,
    elseBlock = null,
    loc,
    openStrip = DEFAULT_STRIP,
    inverseStrip = DEFAULT_STRIP,
    closeStrip = DEFAULT_STRIP,
  }: {
    path: ASTv1.PathExpression;
    params: ASTv1.Expression[];
    hash: ASTv1.Hash;
    defaultBlock: ASTv1.Block;
    elseBlock?: Option<ASTv1.Block>;
    loc: SourceSpan;
    openStrip: ASTv1.StripFlags;
    inverseStrip: ASTv1.StripFlags;
    closeStrip: ASTv1.StripFlags;
  }): ASTv1.BlockStatement {
    return {
      type: 'BlockStatement',
      path: path,
      params,
      hash,
      program: defaultBlock,
      inverse: elseBlock,
      loc: loc,
      openStrip: openStrip,
      inverseStrip: inverseStrip,
      closeStrip: closeStrip,
    };
  }

  comment(value: string, loc: SourceOffset): ParserNodeBuilder<ASTv1.CommentStatement> {
    return {
      type: 'CommentStatement',
      value: value,
      loc,
    };
  }

  mustacheComment(value: string, loc: SourceSpan): ASTv1.MustacheCommentStatement {
    return {
      type: 'MustacheCommentStatement',
      value: value,
      loc,
    };
  }

  concat(
    parts: PresentArray<ASTv1.TextNode | ASTv1.MustacheStatement>,
    loc: SourceSpan
  ): ASTv1.ConcatStatement {
    return {
      type: 'ConcatStatement',
      parts,
      loc,
    };
  }

  element({
    tag,
    selfClosing,
    attrs,
    blockParams,
    modifiers,
    comments,
    children,
    loc,
  }: BuildElementOptions): ASTv1.ElementNode {
    return {
      type: 'ElementNode',
      tag,
      selfClosing: selfClosing,
      attributes: attrs || [],
      blockParams: blockParams || [],
      modifiers: modifiers || [],
      comments: (comments as ASTv1.MustacheCommentStatement[]) || [],
      children: children || [],
      loc,
    };
  }

  elementModifier({
    path,
    params,
    hash,
    loc,
  }: {
    path: ASTv1.PathExpression | ASTv1.SubExpression;
    params: ASTv1.Expression[];
    hash: ASTv1.Hash;
    loc: SourceSpan;
  }): ASTv1.ElementModifierStatement {
    return {
      type: 'ElementModifierStatement',
      path,
      params,
      hash,
      loc,
    };
  }

  attr({
    name,
    value,
    loc,
  }: {
    name: string;
    value: ASTv1.AttrNode['value'];
    loc: SourceSpan;
  }): ASTv1.AttrNode {
    return {
      type: 'AttrNode',
      name: name,
      value: value,
      loc,
    };
  }

  text({ chars, loc }: { chars: string; loc: SourceSpan }): ASTv1.TextNode {
    return {
      type: 'TextNode',
      chars,
      loc,
    };
  }

  sexpr({
    path,
    params,
    hash,
    loc,
  }: {
    path: ASTv1.PathExpression;
    params: ASTv1.Expression[];
    hash: ASTv1.Hash;
    loc: SourceSpan;
  }): ASTv1.SubExpression {
    return {
      type: 'SubExpression',
      path,
      params,
      hash,
      loc,
    };
  }

  path({
    head,
    tail,
    loc,
  }: {
    head: ASTv1.PathHead;
    tail: string[];
    loc: SourceSpan;
  }): ASTv1.PathExpression {
    let { original: originalHead, parts: headParts } = headToString(head);
    let parts = [...headParts, ...tail];
    let original = [...originalHead, ...parts].join('.');

    return new PathExpressionImplV1(original, head, tail, loc);
  }

  head(head: string, loc: SourceSpan): ASTv1.PathHead {
    if (head[0] === '@') {
      return this.atName(head, loc);
    } else if (head === 'this') {
      return this.this(loc);
    } else {
      return this.var(head, loc);
    }
  }

  this(loc: SourceSpan): ASTv1.PathHead {
    return {
      type: 'ThisHead',
      loc,
    };
  }

  atName(name: string, loc: SourceSpan): ASTv1.PathHead {
    // the `@` should be included so we have a complete source range
    assert(name[0] === '@', `call builders.at() with a string that starts with '@'`);

    return {
      type: 'AtHead',
      name,
      loc,
    };
  }

  var(name: string, loc: SourceSpan): ASTv1.PathHead {
    assert(name !== 'this', `You called builders.var() with 'this'. Call builders.this instead`);
    assert(
      name[0] !== '@',
      `You called builders.var() with '${name}'. Call builders.at('${name}') instead`
    );

    return {
      type: 'VarHead',
      name,
      loc,
    };
  }

  hash(pairs: ASTv1.HashPair[], loc: SourceSpan): ASTv1.Hash {
    return {
      type: 'Hash',
      pairs: pairs || [],
      loc,
    };
  }

  pair({
    key,
    value,
    loc,
  }: {
    key: string;
    value: ASTv1.Expression;
    loc: SourceSpan;
  }): ASTv1.HashPair {
    return {
      type: 'HashPair',
      key: key,
      value,
      loc,
    };
  }

  literal<T extends ASTv1.Literal>({
    type,
    value,
    loc,
  }: {
    type: T['type'];
    value: T['value'];
    loc?: SourceLocation;
  }): T {
    return {
      type,
      value,
      original: value,
      loc,
    } as T;
  }

  undefined(): ASTv1.UndefinedLiteral {
    return this.literal({ type: 'UndefinedLiteral', value: undefined });
  }

  null(): ASTv1.NullLiteral {
    return this.literal({ type: 'NullLiteral', value: null });
  }

  string(value: string, loc: SourceSpan): ASTv1.StringLiteral {
    return this.literal({ type: 'StringLiteral', value, loc });
  }

  boolean(value: boolean, loc: SourceSpan): ASTv1.BooleanLiteral {
    return this.literal({ type: 'BooleanLiteral', value, loc });
  }

  number(value: number, loc: SourceSpan): ASTv1.NumberLiteral {
    return this.literal({ type: 'NumberLiteral', value, loc });
  }
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
  tag: string;
  selfClosing: boolean;
  attrs: ASTv1.AttrNode[];
  modifiers: ASTv1.ElementModifierStatement[];
  children: ASTv1.Statement[];
  comments: ElementComment[];
  blockParams: string[];
  loc: SourceSpan;
}

// Expressions

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

export default new Builders();
