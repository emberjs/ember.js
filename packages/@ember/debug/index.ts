import { isChrome, isFirefox } from '@ember/-internals/browser-environment';
import type { AnyFn } from '@ember/-internals/utility-types';
import { DEBUG } from '@glimmer/env';
import type { DeprecateFunc, DeprecationOptions } from './lib/deprecate';
import defaultDeprecate from './lib/deprecate';
import { isTesting } from './lib/testing';
import type { WarnFunc } from './lib/warn';
import _warn from './lib/warn';
import { assert, setAssert } from './lib/assert';

export { registerHandler as registerWarnHandler } from './lib/warn';
export {
  registerHandler as registerDeprecationHandler,
  type DeprecationOptions,
} from './lib/deprecate';
export { default as inspect } from './lib/inspect';
export { isTesting, setTesting } from './lib/testing';
export { default as captureRenderTree } from './lib/capture-render-tree';

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
  (type: 'assert'): typeof assert;
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
  (type: 'assert', func: typeof assert): typeof assert;
  (type: 'info', func: InfoFunc): InfoFunc;
  (type: 'warn', func: WarnFunc): WarnFunc;
  (type: 'debug', func: DebugFunc): DebugFunc;
  (type: 'debugSeal', func: DebugSealFunc): DebugSealFunc;
  (type: 'debugFreeze', func: DebugFreezeFunc): DebugFreezeFunc;
  (type: 'deprecateFunc', func: DeprecateFuncFunc): DeprecateFuncFunc;
  (type: 'deprecate', func: DeprecateFunc): DeprecateFunc;
  (type: 'runInDebug', func: RunInDebugFunc): RunInDebugFunc;
};

// These are the default production build versions:
const noop = () => {};

// SAFETY: these casts are just straight-up lies, but the point is that they do
// not do anything in production builds.
let info: InfoFunc = noop;
let warn: WarnFunc = noop;
let debug: DebugFunc = noop;
let currentDeprecate: DeprecateFunc | undefined;
let debugSeal: DebugSealFunc = noop;
let debugFreeze: DebugFreezeFunc = noop;
let runInDebug: RunInDebugFunc = noop;
let setDebugFunction: SetDebugFunction = noop as unknown as SetDebugFunction;
let getDebugFunction: GetDebugFunction = noop as unknown as GetDebugFunction;

let deprecateFunc: DeprecateFuncFunc = function () {
  return arguments[arguments.length - 1];
};

export function deprecate(...args: Parameters<DeprecateFunc>): ReturnType<DeprecateFunc> {
  return (currentDeprecate ?? defaultDeprecate)(...args);
}

if (DEBUG) {
  setDebugFunction = function (type: DebugFunctionType, callback: Function) {
    switch (type) {
      case 'assert':
        return setAssert(callback as typeof assert);
      case 'info':
        return (info = callback as InfoFunc);
      case 'warn':
        return (warn = callback as WarnFunc);
      case 'debug':
        return (debug = callback as DebugFunc);
      case 'deprecate':
        if (callback === deprecate) {
          currentDeprecate = undefined;
          return deprecate;
        } else {
          return (currentDeprecate = callback as DeprecateFunc);
        }
      case 'debugSeal':
        return (debugSeal = callback as DebugSealFunc);
      case 'debugFreeze':
        return (debugFreeze = callback as DebugFreezeFunc);
      case 'runInDebug':
        return (runInDebug = callback as RunInDebugFunc);
      case 'deprecateFunc':
        return (deprecateFunc = callback as DeprecateFuncFunc);
    }
  } as any;

  getDebugFunction = function (type: DebugFunctionType) {
    switch (type) {
      case 'assert':
        return assert;
      case 'info':
        return info;
      case 'warn':
        return warn;
      case 'debug':
        return debug;
      case 'deprecate':
        return deprecate;
      case 'debugSeal':
        return debugSeal;
      case 'debugFreeze':
        return debugFreeze;
      case 'runInDebug':
        return runInDebug;
      case 'deprecateFunc':
        return deprecateFunc;
    }
  } as any;
}

/**
@module @ember/debug
*/

if (DEBUG) {
  /**
    Display a debug notice.

    Calls to this function are not invoked in production builds.

    ```javascript
    import { debug } from '@ember/debug';

    debug('I\'m a debug notice!');
    ```

    @method debug
    @for @ember/debug
    @static
    @param {String} message A debug message to display.
    @public
  */
  setDebugFunction('debug', function debug(message) {
    console.debug(`DEBUG: ${message}`); /* eslint-disable-line no-console */
  });

  /**
    Display an info notice.

    Calls to this function are removed from production builds, so they can be
    freely added for documentation and debugging purposes without worries of
    incuring any performance penalty.

    @method info
    @private
  */
  setDebugFunction('info', function info() {
    console.info(...arguments); /* eslint-disable-line no-console */
  });

  /**
   @module @ember/debug
   @public
  */

  /**
    Alias an old, deprecated method with its new counterpart.

    Display a deprecation warning with the provided message and a stack trace
    (Chrome and Firefox only) when the assigned method is called.

    Calls to this function are removed from production builds, so they can be
    freely added for documentation and debugging purposes without worries of
    incuring any performance penalty.

    ```javascript
    import { deprecateFunc } from '@ember/debug';

    oldMethod = deprecateFunc('Please use the new, updated method', options, newMethod);
    ```

    @method deprecateFunc
    @static
    @for @ember/debug
    @param {String} message A description of the deprecation.
    @param {Object} [options] The options object for `deprecate`.
    @param {Function} func The new function called to replace its deprecated counterpart.
    @return {Function} A new function that wraps the original function with a deprecation warning
    @private
  */
  setDebugFunction('deprecateFunc', function deprecateFunc(...args: any[]) {
    if (args.length === 3) {
      let [message, options, func] = args as [string, DeprecationOptions, AnyFn];
      return function (this: any, ...args: any[]) {
        deprecate(message, false, options);
        return func.apply(this, args);
      };
    } else {
      let [message, func] = args;
      return function (this: any) {
        deprecate(message);
        return func.apply(this, arguments);
      };
    }
  });

  /**
   @module @ember/debug
   @public
  */
  /**
    Run a function meant for debugging.

    Calls to this function are removed from production builds, so they can be
    freely added for documentation and debugging purposes without worries of
    incuring any performance penalty.

    ```javascript
    import Component from '@ember/component';
    import { runInDebug } from '@ember/debug';

    runInDebug(() => {
      Component.reopen({
        didInsertElement() {
          console.log("I'm happy");
        }
      });
    });
    ```

    @method runInDebug
    @for @ember/debug
    @static
    @param {Function} func The function to be executed.
    @since 1.5.0
    @public
  */
  setDebugFunction('runInDebug', function runInDebug(func) {
    func();
  });

  setDebugFunction('debugSeal', function debugSeal(obj) {
    Object.seal(obj);
  });

  setDebugFunction('debugFreeze', function debugFreeze(obj) {
    // re-freezing an already frozen object introduces a significant
    // performance penalty on Chrome (tested through 59).
    //
    // See: https://bugs.chromium.org/p/v8/issues/detail?id=6450
    if (!Object.isFrozen(obj)) {
      Object.freeze(obj);
    }
  });

  setDebugFunction('warn', _warn);
}

let _warnIfUsingStrippedFeatureFlags;

if (DEBUG && !isTesting()) {
  if (typeof window !== 'undefined' && (isFirefox || isChrome) && window.addEventListener) {
    window.addEventListener(
      'load',
      () => {
        if (
          document.documentElement &&
          document.documentElement.dataset &&
          !document.documentElement.dataset['emberExtension']
        ) {
          let downloadURL;

          if (isChrome) {
            downloadURL =
              'https://chrome.google.com/webstore/detail/ember-inspector/bmdblncegkenkacieihfhpjfppoconhi';
          } else if (isFirefox) {
            downloadURL = 'https://addons.mozilla.org/en-US/firefox/addon/ember-inspector/';
          }

          debug(`For more advanced debugging, install the Ember Inspector from ${downloadURL}`);
        }
      },
      false
    );
  }
}

export {
  assert,
  info,
  warn,
  debug,
  debugSeal,
  debugFreeze,
  runInDebug,
  deprecateFunc,
  setDebugFunction,
  getDebugFunction,
  _warnIfUsingStrippedFeatureFlags,
};
