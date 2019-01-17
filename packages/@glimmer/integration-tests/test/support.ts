interface NestedHooks {
  test(name: string, callback: (assert: Assert) => void): void;

  /**
   * Runs after the last test. If additional tests are defined after the
   * module's queue has emptied, it will not run this hook again.
   */
  after: (fn: (assert: Assert) => void) => void;

  /**
   * Runs after each test.
   */
  afterEach: (fn: (assert: Assert) => void) => void;

  /**
   * Runs before the first test.
   */
  before: (fn: (assert: Assert) => void) => void;

  /**
   * Runs before each test.
   */
  beforeEach: (fn: (assert: Assert) => void) => void;
}

type NestedCallback = (hooks: NestedHooks) => void;

export function module(name: string, nested: (hooks: NestedHooks) => void): void;
export function module(name: string, setup: Partial<NestedHooks>): void;
export function module(name: string, setup: Partial<NestedHooks>, nested: NestedCallback): void;
export function module(name: string, second?: any, third?: any) {
  let nested: NestedCallback;
  let setup;

  if (arguments.length === 3) {
    setup = second;
    nested = third;
  } else if (arguments.length === 2) {
    if (typeof second === 'object') {
      setup = second;
    } else {
      nested = second;
    }
  }

  return QUnit.module(`integration - ${name}`, setup, supplied => {
    nested({ ...supplied, test: QUnit.test });
  });
}

export function test(name: string, callback: (assert: Assert) => void) {
  return QUnit.test(name, callback);
}

export function todo(name: string, callback: (assert: Assert) => void) {
  return (QUnit as any).todo(name, callback);
}

export const assert = QUnit.assert;
