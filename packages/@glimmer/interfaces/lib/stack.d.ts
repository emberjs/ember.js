import type { Nullable } from './core.js';

export interface Stack<T> {
  current: Nullable<T>;

  size: number;
  push(item: T): void;
  pop(): Nullable<T>;
  nth(from: number): Nullable<T>;
  isEmpty(): boolean;
  toArray(): T[];

  /**
   * For debugging
   */
  snapshot(): T[];
}
