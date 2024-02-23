import { asPresentArray, assertPresentArray, deprecate, getFirst } from '@glimmer/util';

import type { SourceSpan } from '../source/span';
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

export class PathExpressionImplV1 implements ASTv1.PathExpression {
  type = 'PathExpression' as const;
  public parts: string[];
  public this = false;
  public data = false;

  constructor(
    public original: string,
    head: ASTv1.PathHead,
    tail: string[],
    public loc: SourceSpan
  ) {
    let parts = tail.slice();

    if (head.type === 'ThisHead') {
      this.this = true;
    } else if (head.type === 'AtHead') {
      this.data = true;
      parts.unshift(head.name.slice(1));
    } else {
      parts.unshift(head.name);
    }

    this.parts = parts;
  }

  // Cache for the head value.
  _head?: ASTv1.PathHead = undefined;

  get head(): ASTv1.PathHead {
    if (this._head) {
      return this._head;
    }

    let firstPart: string;

    if (this.this) {
      firstPart = 'this';
    } else if (this.data) {
      firstPart = `@${getFirst(asPresentArray(this.parts))}`;
    } else {
      assertPresentArray(this.parts);
      firstPart = getFirst(this.parts);
    }

    let firstPartLoc = this.loc.collapse('start').sliceStartChars({
      chars: firstPart.length,
    }).loc;

    return (this._head = b.head(firstPart, firstPartLoc));
  }

  get tail(): string[] {
    return this.this ? this.parts : this.parts.slice(1);
  }
}
