import { Option, PresentArray } from '@glimmer/interfaces';
import { isPresent, mapPresent } from '@glimmer/util';

export interface OptionalList<T> {
  map<U>(callback: (input: T) => U): MapList<T, U, AnyOptionalList<T>>;
  filter<S extends T>(
    predicate: (value: T, index: number, array: T[]) => value is S
  ): AnyOptionalList<S>;
  toArray(): T[];
  toPresentArray(): Option<PresentArray<T>>;
  into<U, V>(options: { ifPresent: (array: PresentList<T>) => U; ifEmpty: () => V }): U | V;
}

export class PresentList<T> implements OptionalList<T> {
  constructor(readonly list: PresentArray<T>) {}

  toArray(): PresentArray<T> {
    return this.list;
  }

  map<U>(callback: (input: T) => U): MapList<T, U, PresentList<T>> {
    let result = mapPresent(this.list, callback);
    return new PresentList(result) as MapList<T, U, this>;
  }

  filter<S extends T>(predicate: (value: T) => value is S): AnyOptionalList<S> {
    let out: S[] = [];

    for (let item of this.list) {
      if (predicate(item)) {
        out.push(item);
      }
    }

    return OptionalList(out);
  }

  toPresentArray(): PresentArray<T> {
    return this.list;
  }

  into<U, V>({ ifPresent }: { ifPresent: (array: PresentList<T>) => U; ifEmpty: () => V }): U | V {
    return ifPresent(this);
  }
}

export class EmptyList<T> implements OptionalList<T> {
  readonly list: T[] = [];

  map<U>(_callback: (input: T) => U): MapList<T, U, EmptyList<T>> {
    return new EmptyList() as MapList<T, U, this>;
  }

  filter<S extends T>(_predicate: (value: T) => value is S): AnyOptionalList<S> {
    return new EmptyList();
  }

  toArray(): T[] {
    return this.list;
  }

  toPresentArray(): Option<PresentArray<T>> {
    return null;
  }

  into<U, V>({ ifEmpty }: { ifPresent: (array: PresentList<T>) => U; ifEmpty: () => V }): U | V {
    return ifEmpty();
  }
}

// export type OptionalList<T> = PresentList<T> | EmptyList<T>;

export function OptionalList<T>(value: readonly T[]): AnyOptionalList<T> {
  if (isPresent(value)) {
    return new PresentList(value);
  } else {
    return new EmptyList<T>();
  }
}

export type AnyOptionalList<T> = (PresentList<T> | EmptyList<T>) & OptionalList<T>;

export type MapList<T, U, L extends OptionalList<T>> = L extends PresentList<T>
  ? PresentList<U>
  : L extends EmptyList<T>
  ? EmptyList<U>
  : never;
