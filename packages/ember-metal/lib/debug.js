export let debugFunctions = {
  assert() {},
  info() {},
  warn() {},
  debug() {},
  deprecate() {},
  deprecateFunc(...args) { return args[args.length - 1]; },
  runInDebug() {},
  debugSeal() {}
};

export function getDebugFunction(name) {
  return debugFunctions[name];
}

export function setDebugFunction(name, fn) {
  debugFunctions[name] = fn;
}

export function assert() {
  return debugFunctions.assert.apply(undefined, arguments);
}

export function info() {
  return debugFunctions.info.apply(undefined, arguments);
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

export function debugSeal() {
  return debugFunctions.debugSeal.apply(undefined, arguments);
}
