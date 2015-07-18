export let debugFunctions = {
  assert() {},
  warn() {},
  debug() {},
  deprecate() {},
  deprecateFunc(...args) { return args[args.length - 1]; },
  runInDebug() {}
};

export function registerDebugFunction(name, fn) {
  debugFunctions[name] = fn;
}

export function assert() {
  return debugFunctions.assert.apply(undefined, arguments);
}

export function warn() {
  return debugFunctions.warn.apply(undefined, arguments);
}

export function debug() {
  return debugFunctions.debug.apply(undefined, arguments);
}

export function deprecate() {
  return debugFunctions.deprecate.apply(undefined, arguments);
}

export function deprecateFunc() {
  return debugFunctions.deprecateFunc.apply(undefined, arguments);
}

export function runInDebug() {
  return debugFunctions.runInDebug.apply(undefined, arguments);
}
