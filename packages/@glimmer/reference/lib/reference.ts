import { symbol, Option } from '@glimmer/util';
import {
  Tag,
  CONSTANT_TAG,
  Revision,
  validateTag,
  valueForTag,
  track,
  consumeTag,
} from '@glimmer/validator';
import { DEBUG } from '@glimmer/env';

export interface Reference<T = unknown> {
  debugLabel?: string;
  value(): T;
  isConst(): boolean;
}

export default Reference;

export interface PathReference<T = unknown> extends Reference<T> {
  get(key: string): PathReference<unknown>;
}

//////////

export abstract class CachedReference<T = unknown> implements Reference<T> {
  private tag: Option<Tag> = null;

  private lastRevision: Option<Revision> = null;
  private lastValue: Option<T> = null;

  value(): T {
    let { lastRevision, tag } = this;

    let lastValue: T;

    if (tag === null || !validateTag(tag, lastRevision!)) {
      tag = this.tag = track(() => {
        lastValue = this.lastValue = this.compute();
      }, DEBUG && (this as any).debugLabel);
      this.lastRevision = valueForTag(tag);
    } else {
      lastValue = this.lastValue!;
    }

    consumeTag(tag);

    return lastValue! as T;
  }

  isConst() {
    if (DEBUG && this.tag === null) {
      throw new Error(
        'Attempted to read isConst before the reference was calculated for the first time'
      );
    }

    return this.tag === CONSTANT_TAG;
  }

  protected abstract compute(): T;
}

//////////

export class ReferenceCache<T> {
  private reference: Reference<T>;
  private lastValue: T;

  constructor(reference: Reference<T>) {
    this.reference = reference;
    this.lastValue = reference.value();
  }

  revalidate(): Validation<T> {
    let { lastValue } = this;
    let currentValue = this.reference.value();

    if (currentValue === lastValue) return NOT_MODIFIED;
    this.lastValue = currentValue;

    return currentValue;
  }
}

export type Validation<T> = T | NotModified;

export type NotModified = typeof NOT_MODIFIED;

const NOT_MODIFIED: unique symbol = symbol('NOT_MODIFIED');

export function isModified<T>(value: Validation<T>): value is T {
  return value !== NOT_MODIFIED;
}
