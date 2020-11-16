import { Option } from './core';

export interface Stack<T> {
  current: Option<T>;

  size: number;
  push(item: T): void;
  pop(): Option<T>;
  nth(from: number): Option<T>;
  isEmpty(): boolean;
  toArray(): T[];
}

export interface NonemptyStack<T> {
  current: T;

  size: number;
  push(item: T): void;
  pop(): T;
  nthBack(from: number): Option<T>;
  toArray(): T[];
}
