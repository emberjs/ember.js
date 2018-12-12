export type Message = string | RegExp;
export type Test = (() => boolean) | boolean;
export type DebugFunctionOptions = object;
export type DebugFunction = (message: string, test: Test, options: DebugFunctionOptions) => void;

export interface DebugEnv {
  runningProdBuild: boolean;
  getDebugFunction(name: string): DebugFunction;
  setDebugFunction(name: string, func: DebugFunction): void;
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
