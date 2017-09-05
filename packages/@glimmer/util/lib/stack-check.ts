import { Opaque, Option, Dict, BlockSymbolTable } from "@glimmer/interfaces";
import { VMHandle } from "@glimmer/opcode-compiler";

export interface Checker<T> {
  validate(value: Opaque): value is T;
  expected(): string;
}

export interface Constructor<T> extends Function {
  prototype: T;
}

class TypeofChecker<T> implements Checker<T> {
  constructor(private expectedType: string) {}

  validate(value: Opaque): value is T {
    return typeof value === this.expectedType;
  }

  expected(): string {
    return `typeof ${this.expectedType}`;
  }
}

class InstanceofChecker<T> implements Checker<T> {
  constructor(private Class: Constructor<T>) {}

  validate(value: Opaque): value is T {
    return value ? value instanceof this.Class : false;
  }

  expected(): string {
    return `an instance of ${this.Class.name}`;
  }
}

class OptionChecker<T> implements Checker<Option<T>> {
  constructor(private checker: Checker<T>) {}

  validate(value: Opaque): value is Option<T> {
    if (value === null) return true;
    return this.checker.validate(value);
  }

  expected(): string {
    return `${this.checker.expected()} or null`;
  }
}

class PropertyChecker<T> implements Checker<T> {
  constructor(private checkers: Dict<Checker<Opaque>>) {}

  validate(obj: Opaque): obj is T {
    if (obj === null || obj === undefined) return false;

    return Object.keys(this.checkers).every(k => {
      if (!(k in obj)) return false;

      let value = obj[k];
      let checker = this.checkers[k];

      return checker.validate(value);
    });
  }

  expected(): string {
    let pairs = Object.keys(this.checkers).map(k => {
      return `${k}: ${this.checkers[k].expected()}`;
    });

    return `{ ${pairs.join(',')} }`;
  }
}

class ArrayChecker<T> implements Checker<T[]> {
  constructor(private checker: Checker<T>) {}

  validate(obj: Opaque): obj is T[] {
    if (obj === null || obj === undefined) return false;
    if (!Array.isArray(obj)) return false;

    return obj.every(item => this.checker.validate(item));
  }

  expected(): string {
    return `Array<${this.checker.expected()}>`;
  }
}

class OpaqueChecker implements Checker<Opaque> {
  validate(_obj: Opaque): _obj is Opaque {
    return true;
  }

  expected(): string {
    throw new Error('unreachable');
  }
}

export function CheckInstanceof<T>(Class: Constructor<T>): Checker<T> {
  return new InstanceofChecker<T>(Class);
};

export function CheckOption<T>(checker: Checker<T>): Checker<Option<T>> {
  return new OptionChecker(checker);
}

export function CheckInterface<T>(obj: Dict<Checker<Opaque>>): Checker<T> {
  return new PropertyChecker(obj);
}

export function CheckArray<T>(obj: Checker<T>): Checker<T[]> {
  return new ArrayChecker(obj);
}

export function check<T>(value: Opaque, checker: Checker<T>): T {
  if (checker.validate(value)) {
    return value;
  } else {
    throw new Error(`Got ${value}, expected:\n${checker.expected()}`);
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

export const CheckNumber: Checker<number> = new TypeofChecker<number>('number');
export const CheckHandle: Checker<VMHandle> = CheckNumber as any as Checker<VMHandle>;
export const CheckString: Checker<string> = new TypeofChecker<string>('string');
export const CheckOpaque: Checker<Opaque> = new OpaqueChecker();

export const CheckSymbolTable: Checker<BlockSymbolTable> =
  CheckInterface({ parameters: CheckArray(CheckNumber), referer: CheckOpaque });