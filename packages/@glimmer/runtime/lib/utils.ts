import { Option, Dict, dict, HAS_NATIVE_WEAKMAP } from '@glimmer/util';

export const EMPTY_ARRAY: any[] = (HAS_NATIVE_WEAKMAP ? Object.freeze([]) : []) as any;
export const EMPTY_DICT: Dict<any> = HAS_NATIVE_WEAKMAP ? Object.freeze(dict<any>()) : dict<any>();

export interface EnumerableCallback<T> {
  (item: T): void;
}

export interface Enumerable<T> {
  forEach(callback: EnumerableCallback<T>): void;
}

export interface Destroyable {
  destroy(): void;
}

export interface Range<T> {
  min(): number;
  max(): number;
  at(index: number): Option<T>;
}

export class ListRange<T> implements Range<T> {
  private list: T[];

  // [start, end]
  private start: number;
  private end: number;

  constructor(list: T[], start: number, end: number) {
    this.list = list;
    this.start = start;
    this.end = end;
  }

  at(index: number): Option<T> {
    if (index >= this.list.length) return null;
    return this.list[index];
  }

  min(): number {
    return this.start;
  }

  max(): number {
    return this.end;
  }
}
