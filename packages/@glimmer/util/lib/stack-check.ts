import { Opaque, Option } from "@glimmer/interfaces";

export interface Checker<T> {
  validate(value: Opaque): value is T;
  throw(value: any): void;
}

export interface Constructor<T> extends Function {
  prototype: T;
}

class TypeofChecker<T> implements Checker<T> {
  constructor(private expected: string) {}

  validate(value: Opaque): value is T {
    return typeof value === this.expected;
  }

  throw(value: Opaque) {
    throw new Error(`Expecting value to be ${this.expected} but was ${typeof value}`);
  }
}

class InstanceofChecker<T> implements Checker<T> {
  constructor(private Class: Constructor<T>) {}

  validate(value: Opaque): value is T {
    return value ? value instanceof this.Class : false;
  }

  throw(value: Opaque) {
    throw new Error(`Expecting value to be and instance of ${this.Class.name} but was ${value}`);
  }
}

class OptionChecker<T> implements Checker<Option<T>> {
  constructor(private checker: Checker<T>) {}

  validate(value: Opaque): value is Option<T> {
    if (value === null) return true;
    return this.checker.validate(value);
  }

  throw(value: Opaque) {
    // TODO: Annoying that this doesn't compose
    this.checker.throw(value);
  }
}

export const StackNumber: Checker<number> = new TypeofChecker<number>('number');
export const StackString: Checker<string> = new TypeofChecker<string>('string');

export function Instanceof<T>(Class: Constructor<T>): Checker<T> {
  return new InstanceofChecker<T>(Class);
};

export function StackOption<T>(checker: Checker<T>): Checker<Option<T>> {
  return new OptionChecker(checker);
}

export function check<T>(value: Opaque, checker: Checker<T>): T {
  if (checker.validate(value)) {
    return value;
  } else {
    throw checker.throw(value);
  }
}

let size = 0;

export function recordStackSize(stack: { sp: number }) {
  size = stack.sp;
}

export function expectStackChange(stack: { sp: number }, expected: number, name: string) {
  let actual = stack.sp - size;

  if (actual === expected) return;

  throw new Error(`Expected stack to change by ${expected}, but it changed by ${actual} in ${name}`);
}
