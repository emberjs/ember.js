declare module '@ember/debug' {
  import type { DeprecateFunc, DeprecationOptions } from '@ember/debug/lib/deprecate';
  import type { WarnFunc } from '@ember/debug/lib/warn';
  export { registerHandler as registerWarnHandler } from '@ember/debug/lib/warn';
  export {
    registerHandler as registerDeprecationHandler,
    type DeprecationOptions,
  } from '@ember/debug/lib/deprecate';
  export { default as inspect } from '@ember/debug/lib/inspect';
  export { isTesting, setTesting } from '@ember/debug/lib/testing';
  export { default as captureRenderTree } from '@ember/debug/lib/capture-render-tree';
  export type DebugFunctionType =
    | 'assert'
    | 'info'
    | 'warn'
    | 'debug'
    | 'deprecate'
    | 'debugSeal'
    | 'debugFreeze'
    | 'runInDebug'
    | 'deprecateFunc';
  export interface AssertFunc {
    (desc: string, condition: unknown): asserts condition;
    (desc: string): never;
  }
  export type DebugFunc = (message: string) => void;
  export type DebugSealFunc = (obj: object) => void;
  export type DebugFreezeFunc = (obj: object) => void;
  export type InfoFunc = (message: string, options?: object) => void;
  export type RunInDebugFunc = (func: () => void) => void;
  export type DeprecateFuncFunc = (
    message: string,
    options: DeprecationOptions,
    func: Function
  ) => Function;
  export type GetDebugFunction = {
    (type: 'assert'): AssertFunc;
    (type: 'info'): InfoFunc;
    (type: 'warn'): WarnFunc;
    (type: 'debug'): DebugFunc;
    (type: 'debugSeal'): DebugSealFunc;
    (type: 'debugFreeze'): DebugFreezeFunc;
    (type: 'deprecateFunc'): DeprecateFuncFunc;
    (type: 'deprecate'): DeprecateFunc;
    (type: 'runInDebug'): RunInDebugFunc;
  };
  export type SetDebugFunction = {
    (type: 'assert', func: AssertFunc): AssertFunc;
    (type: 'info', func: InfoFunc): InfoFunc;
    (type: 'warn', func: WarnFunc): WarnFunc;
    (type: 'debug', func: DebugFunc): DebugFunc;
    (type: 'debugSeal', func: DebugSealFunc): DebugSealFunc;
    (type: 'debugFreeze', func: DebugFreezeFunc): DebugFreezeFunc;
    (type: 'deprecateFunc', func: DeprecateFuncFunc): DeprecateFuncFunc;
    (type: 'deprecate', func: DeprecateFunc): DeprecateFunc;
    (type: 'runInDebug', func: RunInDebugFunc): RunInDebugFunc;
  };
  let assert: AssertFunc;
  let info: InfoFunc;
  let warn: WarnFunc;
  let debug: DebugFunc;
  let deprecate: DeprecateFunc;
  let debugSeal: DebugSealFunc;
  let debugFreeze: DebugFreezeFunc;
  let runInDebug: RunInDebugFunc;
  let setDebugFunction: SetDebugFunction;
  let getDebugFunction: GetDebugFunction;
  let deprecateFunc: DeprecateFuncFunc;
  let _warnIfUsingStrippedFeatureFlags: any;
  export {
    assert,
    info,
    warn,
    debug,
    deprecate,
    debugSeal,
    debugFreeze,
    runInDebug,
    deprecateFunc,
    setDebugFunction,
    getDebugFunction,
    _warnIfUsingStrippedFeatureFlags,
  };
}
