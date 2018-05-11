export type AssertClass = new (env: DebugEnv) => void;

interface Composite {
  asserts: ReadonlyArray<any>;
}

interface Obj {
  [key: string]: () => void;
}

interface CallForEachSubject {
  [key: string]: Obj[];
}

function callForEach(prop: string, func: string) {
  return function(this: CallForEachSubject) {
    for (let i = 0, l = this[prop].length; i < l; i++) {
      this[prop][i][func]();
    }
  };
}

export type Message = string | RegExp;
export type Test = (() => boolean) | boolean;
export type DebugFunctionOptions = object;
export type DebugFunction = (message: string, test: Test, options: DebugFunctionOptions) => void;

export interface DebugEnv {
  runningProdBuild: boolean;
  getDebugFunction(name: string): DebugFunction;
  setDebugFunction(name: string, func: DebugFunction): void;
}

export function buildCompositeAssert<TAssert extends AssertClass>(
  assertClasses: ReadonlyArray<TAssert>
) {
  function Composite(this: Composite, env: DebugEnv) {
    this.asserts = assertClasses.map(Assert => new Assert(env));
  }

  Composite.prototype = {
    reset: callForEach('asserts', 'reset'),
    inject: callForEach('asserts', 'inject'),
    assert: callForEach('asserts', 'assert'),
    restore: callForEach('asserts', 'restore'),
  };

  return Composite;
}

function noop() {}

export function callWithStub(
  env: DebugEnv,
  name: string,
  func: () => void,
  debugStub: DebugFunction = noop
) {
  let originalFunc = env.getDebugFunction(name);
  try {
    env.setDebugFunction(name, debugStub);
    func();
  } finally {
    env.setDebugFunction(name, originalFunc);
  }
}

export function checkTest(test: Test): boolean {
  return typeof test === 'function' ? test() : test;
}
