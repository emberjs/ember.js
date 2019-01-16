import { AbstractIterable, IterationItem, OpaqueIterator } from './iterable';
import { Tag, VersionedReference } from './validators';
import { Option, Dict } from '@glimmer/interfaces';
import { EMPTY_ARRAY } from '@glimmer/util';
import { UpdatableReference } from './property';

export type KeyFor = (item: Dict, index: unknown) => unknown;
export type UnknownKeyFor = (key: string) => KeyFor;

// Public API
export interface IterableKeyDefinitions {
  named: {
    [prop: string]: KeyFor;
  };

  default: UnknownKeyFor;
}

export function keyFor(path: string, definitions: IterableKeyDefinitions) {
  if (path in definitions.named) {
    return definitions.named[path];
  } else {
    return definitions.default;
  }
}

export class IterableImpl
  implements
    AbstractIterable<
      unknown,
      unknown,
      IterationItem<unknown, unknown>,
      UpdatableReference<unknown>,
      UpdatableReference<unknown>
    > {
  public tag: Tag;

  constructor(private ref: VersionedReference, private keyFor: KeyFor) {
    this.tag = ref.tag;
    this.ref = ref;
    this.keyFor = keyFor;
  }

  iterate(): OpaqueIterator {
    let { ref, keyFor } = this;

    let iterable = ref.value() as { [Symbol.iterator]: any } | null | false;

    if (iterable && iterable[Symbol.iterator]) {
      return new NativeIteratorIterator(iterable[Symbol.iterator](), keyFor);
    } else {
      return new NativeIteratorIterator(EMPTY_ARRAY[Symbol.iterator](), () => null);
    }
  }

  valueReferenceFor(item: IterationItem<unknown, unknown>): UpdatableReference<unknown> {
    return new UpdatableReference(item.value);
  }

  updateValueReference(
    reference: UpdatableReference<unknown>,
    item: IterationItem<unknown, unknown>
  ) {
    reference.forceUpdate(item.value);
  }

  memoReferenceFor(item: IterationItem<unknown, unknown>): UpdatableReference<unknown> {
    return new UpdatableReference(item.memo);
  }

  updateMemoReference(
    reference: UpdatableReference<unknown>,
    item: IterationItem<unknown, unknown>
  ) {
    reference.forceUpdate(item.memo);
  }
}

class NativeIteratorIterator implements OpaqueIterator {
  private current: { kind: 'empty' } | { kind: 'first'; value: unknown } | { kind: 'progress' };
  private pos = 0;

  constructor(private iterator: Iterator<unknown>, private keyFor: KeyFor) {
    let first = iterator.next();

    if (first.done === true) {
      this.current = { kind: 'empty' };
    } else {
      this.current = { kind: 'first', value: first.value };
    }
  }

  isEmpty(): boolean {
    return this.current.kind === 'empty';
  }

  next(): Option<IterationItem<unknown, number>> {
    let value: unknown;

    let current = this.current;
    if (current.kind === 'first') {
      this.current = { kind: 'progress' };
      value = current.value;
    } else {
      let next = this.iterator.next();
      this.pos++;

      if (next.done) {
        return null;
      } else {
        value = next.value;
      }
    }

    let { keyFor } = this;

    let key = keyFor(value as Dict, this.pos);
    let memo = this.pos;

    return { key, value, memo };
  }
}
