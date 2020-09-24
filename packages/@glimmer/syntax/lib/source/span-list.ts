// eslint-disable-next-line import/no-extraneous-dependencies
import type { PresentArray } from '@glimmer/interfaces';

import { LocatedWithOptionalSpan, LocatedWithSpan } from './location';
import { SourceOffset, SourceSpan } from './span';

export type HasSpan = SourceSpan | LocatedWithSpan | PresentArray<LocatedWithSpan>;
export type MaybeHasSpan = SourceSpan | LocatedWithOptionalSpan | LocatedWithOptionalSpan[] | null;

export type ToSourceOffset = number | SourceOffset;

export class SpanList {
  static range(span: PresentArray<HasSourceSpan>): SourceSpan;
  static range(span: HasSourceSpan[], fallback: SourceSpan): SourceSpan;
  static range(span: HasSourceSpan[], fallback: SourceSpan = SourceSpan.NON_EXISTENT): SourceSpan {
    return new SpanList(span.map(loc)).getRangeOffset(fallback);
  }

  #span: SourceSpan[];

  constructor(span: SourceSpan[] = []) {
    this.#span = span;
  }

  add(offset: SourceSpan): void {
    this.#span.push(offset);
  }

  getRangeOffset(fallback: SourceSpan): SourceSpan {
    if (this.#span.length === 0) {
      return fallback;
    } else {
      let first = this.#span[0];
      let last = this.#span[this.#span.length - 1];

      return first.extend(last);
    }
  }
}

export type HasSourceSpan = { loc: SourceSpan } | SourceSpan | [HasSourceSpan, ...HasSourceSpan[]];

export function loc(span: HasSourceSpan): SourceSpan {
  if (Array.isArray(span)) {
    let first = span[0];
    let last = span[span.length - 1];

    return loc(first).extend(loc(last));
  } else if (span instanceof SourceSpan) {
    return span;
  } else {
    return span.loc;
  }
}

export type MaybeHasSourceSpan = { loc: SourceSpan } | SourceSpan | MaybeHasSourceSpan[];

export function hasSpan(span: MaybeHasSourceSpan): span is HasSourceSpan {
  if (Array.isArray(span) && span.length === 0) {
    return false;
  }

  return true;
}

export function maybeLoc(location: MaybeHasSourceSpan, fallback: SourceSpan): SourceSpan {
  if (hasSpan(location)) {
    return loc(location);
  } else {
    return fallback;
  }
}
