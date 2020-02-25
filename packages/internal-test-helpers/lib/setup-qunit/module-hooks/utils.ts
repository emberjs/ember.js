import {
  DebugFunctionMapping,
  DebugFunctionType,
  GetDebugFunction,
  SetDebugFunction,
} from '@ember/debug';

export type Message = string | RegExp;

export interface DebugEnv {
  getDebugFunction: GetDebugFunction;
  setDebugFunction: SetDebugFunction;
}

function noop() {}

export function callWithStub<T extends DebugFunctionType>(
  env: DebugEnv,
  name: T,
  func: () => void,
  debugStub = noop as DebugFunctionMapping[T]
) {
  let originalFunc = env.getDebugFunction(name);
  try {
    env.setDebugFunction(name, debugStub);
    func();
  } finally {
    env.setDebugFunction(name, originalFunc);
  }
}
