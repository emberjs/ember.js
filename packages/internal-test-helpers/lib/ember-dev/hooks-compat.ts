export type HookFunction = (assert: Assert) => any;

/**
 * This class can be used to make `setupTest(hooks)` style functions
 * compatible with the non-nested QUnit API.
 */
export default class HooksCompat {
  _before: HookFunction[] = [];
  _beforeEach: HookFunction[] = [];
  _afterEach: HookFunction[] = [];
  _after: HookFunction[] = [];

  before(fn: HookFunction) {
    this._before.push(fn);
  }

  beforeEach(fn: HookFunction) {
    this._beforeEach.push(fn);
  }

  afterEach(fn: HookFunction) {
    this._afterEach.push(fn);
  }

  after(fn: HookFunction) {
    this._after.push(fn);
  }

  runBefore(assert: Assert) {
    this._before.forEach(fn => fn(assert));
  }

  runBeforeEach(assert: Assert) {
    this._beforeEach.forEach(fn => fn(assert));
  }

  runAfterEach(assert: Assert) {
    this._afterEach.forEach(fn => fn(assert));
  }

  runAfter(assert: Assert) {
    this._after.forEach(fn => fn(assert));
  }
}
