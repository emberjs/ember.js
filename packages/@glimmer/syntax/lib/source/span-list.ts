 
import type { PresentArray } from '@glimmer/interfaces';
import { getFirst, getLast, isPresentArray } from '@glimmer/util';

import type { LocatedWithOptionalSpan, LocatedWithSpan } from './location';
import { type SourceOffset, SourceSpan } from './span';

export type HasSpan = SourceSpan | LocatedWithSpan | PresentArray<LocatedWithSpan>;
export type MaybeHasSpan = SourceSpan | LocatedWithOptionalSpan | LocatedWithOptionalSpan[] | null;

export type ToSourceOffset = number | SourceOffset;

export class SpanList {
  static range(span: PresentArray<HasSourceSpan>): SourceSpan;
  static range(span: HasSourceSpan[], fallback: SourceSpan): SourceSpan;
  static range(span: HasSourceSpan[], fallback: SourceSpan = SourceSpan.NON_EXISTENT): SourceSpan {
    return new SpanList(span.map(loc)).getRangeOffset(fallback);
  }

  _span: SourceSpan[];

  constructor(span: SourceSpan[] = []) {
    this._span = span;
  }

  add(offset: SourceSpan): void {
    this._span.push(offset);
  }

  getRangeOffset(fallback: SourceSpan): SourceSpan {
    if (isPresentArray(this._span)) {
      let first = getFirst(this._span);
      let last = getLast(this._span);
      return first.extend(last);
    } else {
      return fallback;
    }
  }
}

export type HasSourceSpan = { loc: SourceSpan } | SourceSpan | [HasSourceSpan, ...HasSourceSpan[]];

export function loc(span: HasSourceSpan): SourceSpan {
  if (Array.isArray(span)) {
    let first = getFirst(span);
    let last = getLast(span);
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
