import { SourceSpan } from '../source/span';
import { PathExpression, PathHead } from './nodes-v1';
import b from './public-builders';

export class PathExpressionImplV1 implements PathExpression {
  type: 'PathExpression' = 'PathExpression';
  public parts: string[];
  public this = false;
  public data = false;

  constructor(public original: string, head: PathHead, tail: string[], public loc: SourceSpan) {
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

  get head(): PathHead {
    let firstPart: string;

    if (this.this) {
      firstPart = 'this';
    } else if (this.data) {
      firstPart = `@${this.parts[0]}`;
    } else {
      firstPart = this.parts[0];
    }

    let firstPartLoc = this.loc.collapse('start').sliceStartChars({
      chars: firstPart.length,
    }).loc;

    return b.head(firstPart, firstPartLoc);
  }

  get tail(): string[] {
    return this.this ? this.parts : this.parts.slice(1);
  }
}
