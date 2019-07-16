/*global module */

const IS_NODE = typeof module === 'object' && typeof module.require === 'function';

let exportModule;
let exportRequire;

if (IS_NODE) {
  exportModule = module;
  exportRequire = module.require;
} else {
  exportModule = null;
  exportRequire = null;
}

export { IS_NODE, exportModule as module, exportRequire as require };
