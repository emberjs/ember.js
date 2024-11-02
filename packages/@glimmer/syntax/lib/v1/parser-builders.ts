import type { Nullable, Optional, PresentArray } from '@glimmer/interfaces';
import { assert } from '@glimmer/debug-util';

import type * as ASTv1 from './api';

import { SourceSpan } from '../source/span';
import { buildLegacyLiteral, buildLegacyMustache, buildLegacyPath } from './legacy-interop';

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
    body,
    params,
    chained = false,
    loc,
  }: {
    body: ASTv1.Statement[];
    params: ASTv1.VarHead[];
    chained?: Optional<boolean>;
    loc: SourceSpan;
  }): ASTv1.Block {
    return {
      type: 'Block',
      body,
      params,
      get blockParams() {
        return this.params.map((p) => p.name);
      },
      set blockParams(params: string[]) {
        this.params = params.map((name) => {
          return b.var({ name, loc: SourceSpan.synthetic(name) });
        });
      },
      chained,
      loc,
    };
  }

  template({
    body,
    blockParams,
    loc,
  }: {
    body: ASTv1.Statement[];
    blockParams: string[];
    loc: SourceSpan;
  }): ASTv1.Template {
    return {
      type: 'Template',
      body,
      blockParams,
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
    path,
    selfClosing,
    attributes,
    modifiers,
    params,
    comments,
    children,
    openTag,
    closeTag,
    loc,
  }: {
    path: ASTv1.PathExpression;
    selfClosing: boolean;
    attributes: ASTv1.AttrNode[];
    modifiers: ASTv1.ElementModifierStatement[];
    params: ASTv1.VarHead[];
    children: ASTv1.Statement[];
    comments: ASTv1.MustacheCommentStatement[];
    openTag: SourceSpan;
    closeTag: Nullable<SourceSpan>;
    loc: SourceSpan;
  }): ASTv1.ElementNode {
    let _selfClosing = selfClosing;

    return {
      type: 'ElementNode',
      path,
      attributes,
      modifiers,
      params,
      comments,
      children,
      openTag,
      closeTag,
      loc,
      get tag() {
        return this.path.original;
      },
      set tag(name: string) {
        this.path.original = name;
      },
      get blockParams() {
        return this.params.map((p) => p.name);
      },
      set blockParams(params: string[]) {
        this.params = params.map((name) => {
          return b.var({ name, loc: SourceSpan.synthetic(name) });
        });
      },
      get selfClosing() {
        return _selfClosing;
      },
      set selfClosing(selfClosing: boolean) {
        _selfClosing = selfClosing;

        if (selfClosing) {
          this.closeTag = null;
        } else {
          this.closeTag = SourceSpan.synthetic(`</${this.tag}>`);
        }
      },
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

  atName({ name, loc }: { name: string; loc: SourceSpan }): ASTv1.AtHead {
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

  var({ name, loc }: { name: string; loc: SourceSpan }): ASTv1.VarHead {
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

const b = new Builders();

export default b;
