import { Opaque } from 'glimmer-util';

export interface Reference<T> {
  value(): T;
}

export default Reference;

export interface PathReference<T> extends Reference<T> {
  get(key: string): PathReference<Opaque>;
}
