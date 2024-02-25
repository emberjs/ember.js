import type { Dict, Nullable, Optional, PresentArray } from '@glimmer/interfaces';
import { assert } from '@glimmer/util';

import type { SourceLocation } from '../source/location';
import type { SourceSpan } from '../source/span';
import type * as ASTv1 from './api';

import {
  buildLegacyLiteral,
  buildLegacyMustache,
  buildLegacyPath,
  buildLegacyTemplate,
} from './legacy-interop';

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
  pos({ line, column }: { line: number; column: number }) {
    return {
      line,
      column,
    };
  }

  blockItself({
    body = [],
    blockParams = [],
    chained = false,
    loc,
  }: {
    body?: ASTv1.Statement[] | undefined;
    blockParams?: string[] | undefined;
    chained?: boolean | undefined;
    loc: SourceSpan;
  }): ASTv1.Block {
    return {
      type: 'Block',
      body: body,
      blockParams: blockParams,
      chained,
      loc,
    };
  }

  template({
    body = [],
    locals = [],
    loc,
  }: {
    body?: ASTv1.Statement[];
    locals?: string[];
    loc: SourceSpan;
  }): ASTv1.Template {
    return buildLegacyTemplate({
      body,
      locals,
      loc,
    });
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
    strip?: Optional<ASTv1.StripFlags>;
  }): ASTv1.MustacheStatement {
    return buildLegacyMustache({
      path,
      params,
      hash,
      trusting,
      strip,
      loc,
    });
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
    path: ASTv1.PathExpression | ASTv1.SubExpression;
    params: ASTv1.Expression[];
    hash: ASTv1.Hash;
    defaultBlock: ASTv1.Block;
    elseBlock: Nullable<ASTv1.Block>;
    loc: SourceSpan;
    openStrip?: Optional<ASTv1.StripFlags>;
    inverseStrip?: Optional<ASTv1.StripFlags>;
    closeStrip?: Optional<ASTv1.StripFlags>;
  }): ASTv1.BlockStatement {
    return {
      type: 'BlockStatement',
      path: path,
      params,
      hash,
      program: defaultBlock,
      inverse: elseBlock,
      loc,
      openStrip,
      inverseStrip,
      closeStrip,
    };
  }

  comment({ value, loc }: { value: string; loc: SourceSpan }): ASTv1.CommentStatement {
    return {
      type: 'CommentStatement',
      value,
      loc,
    };
  }

  mustacheComment({
    value,
    loc,
  }: {
    value: string;
    loc: SourceSpan;
  }): ASTv1.MustacheCommentStatement {
    return {
      type: 'MustacheCommentStatement',
      value,
      loc,
    };
  }

  concat({
    parts,
    loc,
  }: {
    parts: PresentArray<ASTv1.TextNode | ASTv1.MustacheStatement>;
    loc: SourceSpan;
  }): ASTv1.ConcatStatement {
    return {
      type: 'ConcatStatement',
      parts,
      loc,
    };
  }

  element({
    tag,
    selfClosing,
    attributes,
    blockParams,
    modifiers,
    comments,
    children,
    loc,
  }: {
    tag: string;
    selfClosing: boolean;
    attributes: ASTv1.AttrNode[];
    modifiers: ASTv1.ElementModifierStatement[];
    children: ASTv1.Statement[];
    comments: ASTv1.MustacheCommentStatement[];
    blockParams: string[];
    loc: SourceSpan;
  }): ASTv1.ElementNode {
    return {
      type: 'ElementNode',
      tag,
      selfClosing: selfClosing,
      attributes,
      blockParams,
      modifiers,
      comments,
      children,
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
    path: ASTv1.PathExpression | ASTv1.SubExpression;
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
    return buildLegacyPath({ head, tail, loc });
  }

  head({ original, loc }: { original: string; loc: SourceSpan }): ASTv1.PathHead {
    if (original === 'this') {
      return this.this({ loc });
    }
    if (original[0] === '@') {
      return this.atName({ name: original, loc });
    } else {
      return this.var({ name: original, loc });
    }
  }

  this({ loc }: { loc: SourceSpan }): ASTv1.ThisHead {
    return {
      type: 'ThisHead',
      get original() {
        return 'this' as const;
      },
      loc,
    };
  }

  atName({ name, loc }: { name: string; loc: SourceSpan }): ASTv1.PathHead {
    let _name = '';

    const node = {
      type: 'AtHead' as const,
      get name() {
        return _name;
      },
      set name(value) {
        assert(value[0] === '@', `call builders.at() with a string that starts with '@'`);
        assert(
          value.indexOf('.') === -1,
          `builder.at() should not be called with a name with dots in it`
        );
        _name = value;
      },
      get original() {
        return this.name;
      },
      set original(value) {
        this.name = value;
      },
      loc,
    };

    // trigger the assertions
    node.name = name;

    return node;
  }

  var({ name, loc }: { name: string; loc: SourceSpan }): ASTv1.PathHead {
    let _name = '';

    const node = {
      type: 'VarHead' as const,
      get name() {
        return _name;
      },
      set name(value) {
        assert(
          value !== 'this',
          `You called builders.var() with 'this'. Call builders.this instead`
        );
        assert(
          value[0] !== '@',
          `You called builders.var() with '${name}'. Call builders.at('${name}') instead`
        );
        assert(
          value.indexOf('.') === -1,
          `builder.var() should not be called with a name with dots in it`
        );
        _name = value;
      },
      get original() {
        return this.name;
      },
      set original(value) {
        this.name = value;
      },
      loc,
    };

    // trigger the assertions
    node.name = name;

    return node;
  }

  hash({ pairs, loc }: { pairs: ASTv1.HashPair[]; loc: SourceSpan }): ASTv1.Hash {
    return {
      type: 'Hash',
      pairs,
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
      key,
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
    loc: SourceSpan;
  }): T {
    return buildLegacyLiteral({ type, value, loc });
  }
}

// Nodes

export type ElementParts =
  | ['attrs', ...AttrSexp[]]
  | ['modifiers', ...ModifierSexp[]]
  | ['body', ...ASTv1.Statement[]]
  | ['comments', ...ASTv1.MustacheCommentStatement[]]
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

export type SexpValue =
  | string
  | ASTv1.Expression[]
  | Dict<ASTv1.Expression>
  | LocSexp
  | PathSexp
  | undefined;

export default new Builders();
