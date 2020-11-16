import { GlimmerSyntaxError } from '@glimmer/syntax';

import { AnyOptionalList, OptionalList } from './list';

abstract class ResultImpl<T> {
  static all<T extends Result<unknown>[]>(...results: T): MapAll<T> {
    let out: unknown[] = [];

    for (let result of results) {
      if (result.isErr) {
        return result.cast();
      } else {
        out.push(result.value);
      }
    }

    return Ok(out as MapAllOk<T>);
  }

  abstract mapOk<U>(callback: (value: T) => U): Result<U>;
  abstract readonly isOk: boolean;
  abstract readonly isErr: boolean;
}

export const Result = ResultImpl;

class OkImpl<T> extends ResultImpl<T> {
  readonly isOk = true;
  readonly isErr = false;

  constructor(readonly value: T) {
    super();
  }

  expect(_message?: string): T {
    return this.value;
  }

  ifOk(callback: (value: T) => void): this {
    callback(this.value);
    return this;
  }

  andThen<U>(callback: (value: T) => Result<U>): Result<U> {
    return callback(this.value);
  }

  mapOk<U>(callback: (value: T) => U): Result<U> {
    return Ok(callback(this.value));
  }

  ifErr(_callback: (value: GlimmerSyntaxError) => void): this {
    return this;
  }

  mapErr(_callback: (value: GlimmerSyntaxError) => GlimmerSyntaxError): Result<T> {
    return this;
  }
}

class ErrImpl<T> extends ResultImpl<T> {
  readonly isOk = false;
  readonly isErr = true;

  constructor(readonly reason: GlimmerSyntaxError) {
    super();
  }

  expect(message?: string): T {
    throw new Error(message || 'expected an Ok, got Err');
  }

  andThen<U>(_callback: (value: T) => Result<U>): Result<U> {
    return this.cast<U>();
  }

  mapOk<U>(_callback: (value: T) => U): Result<U> {
    return this.cast<U>();
  }

  ifOk(_callback: (value: T) => void): this {
    return this;
  }

  mapErr(callback: (value: GlimmerSyntaxError) => GlimmerSyntaxError): Result<T> {
    return Err(callback(this.reason));
  }

  ifErr(callback: (value: GlimmerSyntaxError) => void): this {
    callback(this.reason);
    return this;
  }

  cast<U>(): Result<U> {
    return (this as unknown) as Result<U>;
  }
}

export function isResult<T>(input: MaybeResult<T>): input is Result<T> {
  return input instanceof ResultImpl;
}

export function intoResult<T>(input: MaybeResult<T>): Result<T> {
  if (isResult(input)) {
    return input;
  } else {
    return Ok(input);
  }
}

export type Result<T> = OkImpl<T> | ErrImpl<T>;

type MapAllOk<T extends Result<unknown>[]> = {
  [P in keyof T]: T[P] extends Result<infer Inner> ? Inner : never;
};

type MapAll<T extends Result<unknown>[]> = Result<MapAllOk<T>>;

export function Ok<T>(value: T): Result<T> {
  return new OkImpl(value);
}

export type Ok<T> = OkImpl<T>;

export function Err<T>(reason: GlimmerSyntaxError): Result<T> {
  return new ErrImpl(reason);
}

export type Err<T> = ErrImpl<T>;

export type MaybeResult<T> = T | Result<T>;

export class MapIntoResultArray<T> {
  constructor(private items: T[]) {}

  map<U>(callback: (item: T) => Result<U>): Result<U[]> {
    let out = new ResultArray<U>();

    for (let item of this.items) {
      out.add(callback(item));
    }

    return out.toArray();
  }
}

export class ResultArray<T> {
  constructor(private items: Result<T>[] = []) {}

  add(item: Result<T>): void {
    this.items.push(item);
  }

  toArray(): Result<T[]> {
    let err = this.items.filter((item): item is ErrImpl<T> => item instanceof ErrImpl)[0];

    if (err !== undefined) {
      return err.cast<T[]>();
    } else {
      return Ok((this.items as OkImpl<T>[]).map((item) => item.value));
    }
  }

  toOptionalList(): Result<AnyOptionalList<T>> {
    return this.toArray().mapOk((arr) => OptionalList(arr));
  }
}
