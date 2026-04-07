import type {
  AnyFn,
  BlockSymbolTable,
  Dict,
  Maybe,
  Nullable,
  ProgramSymbolTable,
  SimpleDocumentFragment,
  SimpleElement,
  SimpleNode,
} from '@glimmer/interfaces';
import type { MachineRegister, Register, SyscallRegister } from '@glimmer/vm';
import { LOCAL_DEBUG } from '@glimmer/local-debug-flags';
import { $fp, $pc, $ra, $s0, $s1, $sp, $t0, $t1, $v0 } from '@glimmer/vm';

import type { Primitive } from './dism/dism';

export interface Checker<T> {
  type: T;

  validate(value: unknown): value is T;
  expected(): string;
}

class NoopChecker<T> implements Checker<T> {
  declare type: T;
  validate(value: unknown): value is T {
    return true;
  }
  expected(): string {
    return '<noop>';
  }
}

export function wrap<T>(checker: () => Checker<T>): Checker<T> {
  if (!LOCAL_DEBUG) {
    return new NoopChecker<T>();
  }

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

export interface Constructor<T> extends AnyFn {
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

class PrimitiveChecker implements Checker<Primitive> {
  declare type: Primitive;

  validate(value: unknown): value is Primitive {
    return (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
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

class UndefinedChecker implements Checker<undefined> {
  declare type: undefined;

  validate(value: unknown): value is undefined {
    return value === undefined;
  }

  expected(): string {
    return `undefined`;
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
    if (obj === null || typeof obj !== 'object') return false;

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
      typeof value === 'object' &&
      value !== null &&
      typeof (value as { toHTML?: unknown }).toHTML === 'function'
    );
  }

  expected(): string {
    return `SafeString`;
  }
}

export function CheckInstanceof<T>(Class: Constructor<T>): Checker<T>;
export function CheckInstanceof<T>(Class: Constructor<T>): Checker<T> | undefined {
  if (LOCAL_DEBUG) {
    return new InstanceofChecker<T>(Class);
  }
}

export const CheckRegister: Checker<Register> = new (class {
  declare type: Register;
  validate(value: unknown): value is Register {
    switch (value) {
      case $s0:
      case $s1:
      case $sp:
      case $fp:
      case $ra:
      case $pc:
      case $t0:
      case $t1:
      case $v0:
        return true;
      default:
        return false;
    }
  }
  expected(): string {
    return `Register`;
  }
})();

export const CheckSyscallRegister: Checker<SyscallRegister> = new (class {
  declare type: SyscallRegister;
  validate(value: unknown): value is SyscallRegister {
    switch (value) {
      case $s0:
      case $s1:
      case $t0:
      case $t1:
      case $v0:
        return true;
      default:
        return false;
    }
  }
  expected(): string {
    return `syscall register ($s0, $s1, $t0, $t1, $v0)`;
  }
})();

export const CheckMachineRegister: Checker<MachineRegister> = new (class {
  declare type: MachineRegister;
  validate(value: unknown): value is MachineRegister {
    switch (value) {
      case $sp:
      case $fp:
      case $ra:
      case $pc:
        return true;
      default:
        return false;
    }
  }
  expected(): string {
    return `machine register ($sp, $fp, $ra, $pc)`;
  }
})();

export function CheckNullable<T>(checker: Checker<T>): Checker<Nullable<T>>;
export function CheckNullable<T>(checker: Checker<T>): Checker<Nullable<T>> | undefined {
  if (LOCAL_DEBUG) {
    return new OptionChecker(checker, null);
  }
}

export function CheckMaybe<T>(checker: Checker<T>): Checker<Maybe<T>>;
export function CheckMaybe<T>(checker: Checker<T>): Checker<Maybe<T>> | undefined {
  if (LOCAL_DEBUG) {
    return new MaybeChecker(checker);
  }
}

export function CheckInterface<
  I extends { [P in keyof O]: O[P]['type'] },
  O extends Dict<Checker<unknown>>,
>(obj: O): Checker<I>;
export function CheckInterface<
  I extends { [P in keyof O]: O[P]['type'] },
  O extends Dict<Checker<unknown>>,
>(obj: O): Checker<I> | undefined {
  if (LOCAL_DEBUG) {
    return new PropertyChecker(obj);
  }
}

export function CheckArray<T>(obj: Checker<T>): Checker<T[]>;
export function CheckArray<T>(obj: Checker<T>): Checker<T[]> | undefined {
  if (LOCAL_DEBUG) {
    return new ArrayChecker(obj);
  }
}

export function CheckDict<T>(obj: Checker<T>): Checker<Dict<T>>;
export function CheckDict<T>(obj: Checker<T>): Checker<Dict<T>> | undefined {
  if (LOCAL_DEBUG) {
    return new DictChecker(obj);
  }
}

function defaultMessage(value: unknown, expected: string): string {
  return `Got ${value}, expected:\n${expected}`;
}

/*@__NO_SIDE_EFFECTS__*/
export function check<T>(
  value: unknown,
  checker: Checker<T>,
  message?: (value: unknown, expected: string) => string
): T;
export function check<T, U extends T>(value: T, checker: (value: T) => asserts value is U): U;
export function check<T>(
  value: unknown,
  checker: Checker<T> | ((value: unknown) => void),
  message?: (value: unknown, expected: string) => string
): T {
  if (!LOCAL_DEBUG) {
    return value as T;
  }

  if (typeof checker === 'function') {
    checker(value);
    return value as T;
  }
  if (checker.validate(value)) {
    return value;
  } else {
    throw new Error((message ?? defaultMessage)(value, checker.expected()));
  }
}

let size = 0;

export function recordStackSize(sp: number) {
  size = sp;
}

export function expectStackChange(stack: { sp: number }, expected: number, name: string) {
  if (LOCAL_DEBUG) {
    return;
  }

  let actual = stack.sp - size;

  if (actual === expected) return;

  throw new Error(
    `Expected stack to change by ${expected}, but it changed by ${actual} in ${name}`
  );
}

export const CheckPrimitive: Checker<Primitive> = !LOCAL_DEBUG
  ? new NoopChecker()
  : new PrimitiveChecker();
export const CheckFunction: Checker<AnyFn> = !LOCAL_DEBUG
  ? new NoopChecker()
  : new TypeofChecker<AnyFn>('function');
export const CheckNumber: Checker<number> = !LOCAL_DEBUG
  ? new NoopChecker()
  : new TypeofChecker<number>('number');
export const CheckBoolean: Checker<boolean> = !LOCAL_DEBUG
  ? new NoopChecker()
  : new TypeofChecker<boolean>('boolean');
export const CheckHandle: Checker<number> = LOCAL_DEBUG ? CheckNumber : new NoopChecker();
export const CheckString: Checker<string> = !LOCAL_DEBUG
  ? new NoopChecker()
  : new TypeofChecker<string>('string');
export const CheckNull: Checker<null> = !LOCAL_DEBUG ? new NoopChecker() : new NullChecker();
export const CheckUndefined: Checker<undefined> = !LOCAL_DEBUG
  ? new NoopChecker()
  : new UndefinedChecker();
export const CheckUnknown: Checker<unknown> = !LOCAL_DEBUG
  ? new NoopChecker()
  : new OpaqueChecker();
export const CheckSafeString: Checker<SafeString> = !LOCAL_DEBUG
  ? new NoopChecker()
  : new SafeStringChecker();
export const CheckObject: Checker<object> = !LOCAL_DEBUG ? new NoopChecker() : new ObjectChecker();

export function CheckOr<T, U>(left: Checker<T>, right: Checker<U>): Checker<T | U> {
  if (!LOCAL_DEBUG) {
    return new NoopChecker<T | U>();
  }
  return new OrChecker(left, right);
}

export function CheckValue<T>(value: T, desc = String(value)): Checker<T> {
  if (!LOCAL_DEBUG) {
    return new NoopChecker<T>();
  }
  return new ExactValueChecker(value, desc);
}

export const CheckBlockSymbolTable: Checker<BlockSymbolTable> = LOCAL_DEBUG
  ? CheckInterface({
      parameters: CheckArray(CheckNumber),
    })
  : new NoopChecker();

export const CheckProgramSymbolTable: Checker<ProgramSymbolTable> = LOCAL_DEBUG
  ? CheckInterface({
      symbols: CheckArray(CheckString),
    })
  : new NoopChecker();

export const CheckElement: Checker<SimpleElement> = LOCAL_DEBUG
  ? CheckInterface({
      nodeType: CheckValue(1),
      tagName: CheckString,
      nextSibling: CheckUnknown,
    })
  : new NoopChecker();

export const CheckDocumentFragment: Checker<SimpleDocumentFragment> = LOCAL_DEBUG
  ? CheckInterface({
      nodeType: CheckValue(11),
      nextSibling: CheckUnknown,
    })
  : new NoopChecker();

export const CheckNode: Checker<SimpleNode> = LOCAL_DEBUG
  ? CheckInterface({
      nodeType: CheckNumber,
      nextSibling: CheckUnknown,
    })
  : new NoopChecker();
