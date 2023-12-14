import { DEBUG } from '@glimmer/env';
export let HANDLERS = {};
let registerHandler = function registerHandler(_type, _callback) {};
let invoke = () => {};
if (DEBUG) {
  registerHandler = function registerHandler(type, callback) {
    let nextHandler = HANDLERS[type] || (() => {});
    HANDLERS[type] = (message, options) => {
      callback(message, options, nextHandler);
    };
  };
  invoke = function invoke(type, message, test, options) {
    if (test) {
      return;
    }
    let handlerForType = HANDLERS[type];
    if (handlerForType) {
      handlerForType(message, options);
    }
  };
}
export { registerHandler, invoke };