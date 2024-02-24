import type { PresentArray } from '@glimmer/interfaces/index';
import { asPresentArray, deprecate } from '@glimmer/util';

import type * as ASTv1 from './nodes-v1';

import b from './public-builders';

export type TemplateParams = Omit<ASTv1.Template, 'type' | 'blockParams'>;

export function buildLegacyTemplate({ body, locals, loc }: TemplateParams): ASTv1.Template {
  const node = {
    type: 'Template',
    body,
    loc,
  };

  Object.defineProperty(node, 'locals', {
    enumerable: true,
    writable: false,
    value: Object.freeze([...locals]),
  });

  Object.defineProperty(node, 'blockParams', {
    enumerable: false,
    get(): readonly string[] {
      deprecate(
        `Template nodes can never have block params, for in-scope variables, use locals instead`
      );
      return this.locals;
    },
  });

  return node as ASTv1.Template;
}

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

function original(head: ASTv1.PathHead, tail: readonly string[]): string {
  switch (head.type) {
    case 'ThisHead':
      return ['this', ...tail].join('.');
    case 'AtHead':
    case 'VarHead':
      return [head.name, ...tail].join('.');
  }
}

export function buildLegacyPath({ head, tail, loc }: PathExpressionParams): ASTv1.PathExpression {
  const node = {
    type: 'PathExpression',
    head,
    tail,
    loc,
  };

  Object.defineProperty(node, 'original', {
    enumerable: true,
    get(this: typeof node): string {
      return original(this.head, this.tail);
    },
    set(this: typeof node, value: string) {
      let [head, ...tail] = asPresentArray(value.split('.'));
      this.head = b.head(head, this.head.loc);
      this.tail = tail;
    },
  });

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
