import { Opaque, Dict } from '@glimmer/interfaces';
import { QUnitAssert } from './interfaces';

// A bunch of this file was extracted from the Glimmer testing harness.
// TODO: Clean this up and eliminate anything that isn't generically unnecessary.

export type TestFunction = (this: TestCase, assert: typeof QUnit.assert) => void;

function setTestingDescriptor(descriptor: PropertyDescriptor): void {
  let testFunction = descriptor.value as Function & { isTest: boolean } ;
  descriptor.enumerable = true;
  testFunction["isTest"] = true;
}

function isTestFunction(value: any): value is TestFunction {
  return typeof value === "function" && value.isTest;
}

export function test(meta: Dict<Opaque>): MethodDecorator;
export function test(
  _target: object,
  _name: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor | void;
export function test(...args: any[]) {
  if (args.length === 1) {
    let meta: Dict<Opaque> = args[0];
    return (_target: Object, _name: string, descriptor: PropertyDescriptor) => {
      let testFunction = descriptor.value as Function & Dict<Opaque> ;
      Object.keys(meta).forEach(key => (testFunction[key] = meta[key]));
      setTestingDescriptor(descriptor);
    };
  }

  let descriptor = args[2];
  setTestingDescriptor(descriptor);
  return descriptor;
}

export interface Constructor<T = Opaque, Prototype = T> {
  new(...args: any[]): T;
  prototype: Prototype;
}

export function module(
  name: string
): (klass: (typeof TestCase) & Constructor) => void {
  return function(klass: typeof TestCase & Constructor) {
    QUnit.module(name);

    let proto = klass.prototype as any as Dict<Opaque>;
    for (let prop in proto) {
      const test = proto[prop];

      if (isTestFunction(test)) {
        QUnit.test(prop, assert => new klass().run(test, assert));
      }
    }
  };
}

export abstract class TestCase {
  before() {}

  run(test: TestFunction, assert: QUnitAssert): void | Promise<void> {
    this.before();
    return test.call(this, assert);
  }
}
