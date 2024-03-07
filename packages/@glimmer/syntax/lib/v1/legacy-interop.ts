import type { PresentArray } from '@glimmer/interfaces/index';
import { asPresentArray, deprecate } from '@glimmer/util';

import type * as ASTv1 from './nodes-v1';

import b from './public-builders';

export type MustacheStatementParams = Omit<ASTv1.MustacheStatement, 'type' | 'escaped'>;

export function buildLegacyMustache({
  path,
  params,
  hash,
  trusting,
  strip,
  loc,
}: MustacheStatementParams): ASTv1.MustacheStatement {
  const node = {
    type: 'MustacheStatement',
    path,
    params,
    hash,
    trusting,
    strip,
    loc,
  };

  Object.defineProperty(node, 'escaped', {
    enumerable: false,
    get(this: typeof node): boolean {
      deprecate(`The escaped property on mustache nodes is deprecated, use trusting instead`);
      return !this.trusting;
    },
    set(this: typeof node, value: boolean) {
      deprecate(`The escaped property on mustache nodes is deprecated, use trusting instead`);
      this.trusting = !value;
    },
  });

  return node as ASTv1.MustacheStatement;
}

export type PathExpressionParams = Omit<ASTv1.MinimalPathExpression, 'type'>;

export function buildLegacyPath({ head, tail, loc }: PathExpressionParams): ASTv1.PathExpression {
  const node = {
    type: 'PathExpression',
    head,
    tail,
    get original() {
      return [this.head.original, ...this.tail].join('.');
    },
    set original(value: string) {
      let [head, ...tail] = asPresentArray(value.split('.'));
      this.head = b.head(head, this.head.loc);
      this.tail = tail;
    },
    loc,
  };

  Object.defineProperty(node, 'parts', {
    enumerable: false,
    get(this: { original: string }): readonly string[] {
      deprecate(`The parts property on path nodes is deprecated, use trusting instead`);
      return Object.freeze(this.original.split('.'));
    },
    set(this: { original: string }, value: PresentArray<string>) {
      deprecate(`The parts property on mustache nodes is deprecated, use trusting instead`);
      this.original = value.join('.');
    },
  });

  Object.defineProperty(node, 'this', {
    enumerable: false,
    get(this: typeof node): boolean {
      deprecate(`The this property on path nodes is deprecated, use head.type instead`);
      return this.head.type === 'ThisHead';
    },
  });

  Object.defineProperty(node, 'data', {
    enumerable: false,
    get(this: typeof node): boolean {
      deprecate(`The data property on path nodes is deprecated, use head.type instead`);
      return this.head.type === 'AtHead';
    },
  });

  return node as ASTv1.PathExpression;
}

export function buildLegacyLiteral<T extends ASTv1.Literal>({
  type,
  value,
  loc,
}: {
  type: T['type'];
  value: T['value'];
  loc: T['loc'];
}): T {
  const node = {
    type,
    value,
    loc,
  };

  Object.defineProperty(node, 'original', {
    enumerable: false,
    get(this: typeof node): T['original'] {
      deprecate(`The original property on literal nodes is deprecated, use value instead`);
      return this.value;
    },
    set(this: typeof node, value: T['original']) {
      deprecate(`The original property on literal nodes is deprecated, use value instead`);
      this.value = value;
    },
  });

  return node as T;
}
