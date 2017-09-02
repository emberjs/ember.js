export interface Checker<T> {
  validate(value: T): boolean;
  throw(value: any): void;
}

const NumberChecker = class implements Checker<number> {
  validate(value: number): value is number {
    return this.type(value) === 'number';
  }

  type(value: number) { return typeof value; }

  throw(value: number) {
    throw new Error(`Expecting value to be number but was ${this.type(value)}`)
  }
}

export const IsNumber = new NumberChecker();

export function stackCheck<T>(value: T, checker: Checker<T>): T | void {
  let valid = checker.validate(value);
  if (valid) return value as T;
  checker.throw(value);
}
