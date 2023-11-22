import type {
  BlockSymbolTable,
  Dict,
  Maybe,
  Nullable,
  ProgramSymbolTable,
  SimpleDocumentFragment,
  SimpleElement,
  SimpleNode,
} from '@glimmer/interfaces';

export interface Checker<T> {
  type: T;

  validate(value: unknown): value is T;
  expected(): string;
}

export function wrap<T>(checker: () => Checker<T>): Checker<T> {
  class Wrapped {
    declare type: T;

    validate(value: unknown): value is T {
      return checker().validate(value);
    }

    expected(): string {
      return checker().expected();
    }
  }

  return new Wrapped();
}

export interface Constructor<T> extends Function {
  prototype: T;
}

class TypeofChecker<T> implements Checker<T> {
  declare type: T;

  constructor(private expectedType: string) {}

  validate(value: unknown): value is T {
    return typeof value === this.expectedType;
  }

  expected(): string {
    return `typeof ${this.expectedType}`;
  }
}

export type Primitive = undefined | null | boolean | number | string;

class PrimitiveChecker implements Checker<Primitive> {
  declare type: Primitive;

  validate(value: unknown): value is Primitive {
    return (
      typeof value !== 'string' ||
      typeof value === 'number' ||
      typeof value === 'string' ||
      value === undefined ||
      value === null
    );
  }

  expected(): string {
    return `a primitive`;
  }
}

class NullChecker implements Checker<null> {
  declare type: null;

  validate(value: unknown): value is null {
    return value === null;
  }

  expected(): string {
    return `null`;
  }
}

class InstanceofChecker<T> implements Checker<T> {
  declare type: T;

  constructor(private Class: Constructor<T>) {}

  validate(value: unknown): value is T {
    return value ? value instanceof this.Class : false;
  }

  expected(): string {
    return `an instance of ${this.Class.name}`;
  }
}

class OptionChecker<T> implements Checker<Nullable<T>> {
  declare type: Nullable<T>;

  constructor(
    private checker: Checker<T>,
    private emptyValue: null | undefined
  ) {}

  validate(value: unknown): value is Nullable<T> {
    if (value === this.emptyValue) return true;
    return this.checker.validate(value);
  }

  expected(): string {
    return `${this.checker.expected()} or null`;
  }
}

class MaybeChecker<T> implements Checker<Maybe<T>> {
  declare type: Maybe<T>;

  constructor(private checker: Checker<T>) {}

  validate(value: unknown): value is Maybe<T> {
    if (value === null || value === undefined) return true;
    return this.checker.validate(value);
  }

  expected(): string {
    return `${this.checker.expected()} or null or undefined`;
  }
}

class OrChecker<T, U> implements Checker<T | U> {
  declare type: T | U;

  constructor(
    private left: Checker<T>,
    private right: Checker<U>
  ) {}

  validate(value: unknown): value is T | U {
    return this.left.validate(value) || this.right.validate(value);
  }

  expected(): string {
    return `${this.left.expected()} or ${this.right.expected()}`;
  }
}

class ExactValueChecker<T> implements Checker<T> {
  declare type: T;

  constructor(
    private value: T,
    private desc: string
  ) {}

  validate(obj: unknown): obj is T {
    return obj === this.value;
  }

  expected(): string {
    return this.desc;
  }
}

class PropertyChecker<T> implements Checker<T> {
  declare type: T;

  constructor(private checkers: Dict<Checker<unknown>>) {}

  validate(obj: unknown): obj is T {
    if (typeof obj !== 'object') return false;
    if (obj === null || obj === undefined) return false;

    return Object.entries(this.checkers).every(([k, checker]) =>
      k in obj ? checker.validate((obj as Dict)[k]) : false
    );
  }

  expected(): string {
    let pairs = Object.entries(this.checkers).map(([k, checker]) => {
      return `${k}: ${checker.expected()}`;
    });

    return `{ ${pairs.join(',')} }`;
  }
}

class ArrayChecker<T> implements Checker<T[]> {
  declare type: T[];

  constructor(private checker: Checker<T>) {}

  validate(obj: unknown): obj is T[] {
    if (obj === null || obj === undefined) return false;
    if (!Array.isArray(obj)) return false;

    return obj.every((item) => this.checker.validate(item));
  }

  expected(): string {
    return `Array<${this.checker.expected()}>`;
  }
}

class DictChecker<T> implements Checker<Dict<T>> {
  declare type: Dict<T>;

  constructor(private checker: Checker<T>) {}

  validate(value: unknown): value is Dict<T> {
    let isDict =
      typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === null;

    if (!isDict) return false;

    let { checker } = this;

    for (let key in value as Dict) {
      if (!checker.validate((value as Dict)[key])) {
        return false;
      }
    }

    return true;
  }

  expected(): string {
    return `a primitive`;
  }
}

class OpaqueChecker implements Checker<unknown> {
  type: unknown;

  validate(_obj: unknown): _obj is unknown {
    return true;
  }

  expected(): string {
    return `any`;
  }
}

class ObjectChecker implements Checker<unknown> {
  declare type: object;

  validate(obj: unknown): obj is object {
    return typeof obj === 'function' || (typeof obj === 'object' && obj !== null);
  }

  expected(): string {
    return `an object or function (valid WeakMap key)`;
  }
}

export interface SafeString {
  toHTML(): string;
}

class SafeStringChecker implements Checker<SafeString> {
  declare type: SafeString;

  validate(value: unknown): value is SafeString {
    return (
      typeof value === 'object' && value !== null && typeof (value as any).toHTML === 'function'
    );
  }

  expected(): string {
    return `SafeString`;
  }
}

export function CheckInstanceof<T>(Class: Constructor<T>): Checker<T> {
  return new InstanceofChecker<T>(Class);
}

export function CheckOption<T>(checker: Checker<T>): Checker<Nullable<T>> {
  return new OptionChecker(checker, null);
}

export function CheckMaybe<T>(checker: Checker<T>): Checker<Maybe<T>> {
  return new MaybeChecker(checker);
}

export function CheckInterface<
  I extends { [P in keyof O]: O[P]['type'] },
  O extends Dict<Checker<unknown>>,
>(obj: O): Checker<I> {
  return new PropertyChecker(obj);
}

export function CheckArray<T>(obj: Checker<T>): Checker<T[]> {
  return new ArrayChecker(obj);
}

export function CheckDict<T>(obj: Checker<T>): Checker<Dict<T>> {
  return new DictChecker(obj);
}

function defaultMessage(value: unknown, expected: string): string {
  return `Got ${value}, expected:\n${expected}`;
}

export function check<T>(
  value: unknown,
  checker: Checker<T>,
  message?: (value: unknown, expected: string) => string
): T;
export function check<T, U extends T>(value: T, checker: (value: T) => asserts value is U): U;
export function check<T>(
  value: unknown,
  checker: Checker<T> | ((value: unknown) => void),
  message: (value: unknown, expected: string) => string = defaultMessage
): T {
  if (typeof checker === 'function') {
    checker(value);
    return value as T;
  }
  if (checker.validate(value)) {
    return value;
  } else {
    throw new Error(message(value, checker.expected()));
  }
}

let size = 0;

export function recordStackSize(sp: number) {
  size = sp;
}

export function expectStackChange(stack: { sp: number }, expected: number, name: string) {
  let actual = stack.sp - size;

  if (actual === expected) return;

  throw new Error(
    `Expected stack to change by ${expected}, but it changed by ${actual} in ${name}`
  );
}

export const CheckPrimitive: Checker<Primitive> = new PrimitiveChecker();
export const CheckFunction: Checker<Function> = new TypeofChecker<Function>('function');
export const CheckNumber: Checker<number> = new TypeofChecker<number>('number');
export const CheckBoolean: Checker<boolean> = new TypeofChecker<boolean>('boolean');
export const CheckHandle: Checker<number> = CheckNumber;
export const CheckString: Checker<string> = new TypeofChecker<string>('string');
export const CheckNull: Checker<null> = new NullChecker();
export const CheckUnknown: Checker<unknown> = new OpaqueChecker();
export const CheckSafeString: Checker<SafeString> = new SafeStringChecker();
export const CheckObject: Checker<object> = new ObjectChecker();

export function CheckOr<T, U>(left: Checker<T>, right: Checker<U>): Checker<T | U> {
  return new OrChecker(left, right);
}

export function CheckValue<T>(value: T, desc = String(value)): Checker<T> {
  return new ExactValueChecker(value, desc);
}

export const CheckBlockSymbolTable: Checker<BlockSymbolTable> = CheckInterface({
  parameters: CheckArray(CheckNumber),
});

export const CheckProgramSymbolTable: Checker<ProgramSymbolTable> = CheckInterface({
  hasEval: CheckBoolean,
  symbols: CheckArray(CheckString),
});

export const CheckElement: Checker<SimpleElement> = CheckInterface({
  nodeType: CheckValue(1),
  tagName: CheckString,
  nextSibling: CheckUnknown,
});

export const CheckDocumentFragment: Checker<SimpleDocumentFragment> = CheckInterface({
  nodeType: CheckValue(11),
  nextSibling: CheckUnknown,
});

export const CheckNode: Checker<SimpleNode> = CheckInterface({
  nodeType: CheckNumber,
  nextSibling: CheckUnknown,
});
