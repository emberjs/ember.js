import { DEBUG } from '@glimmer/env';

export type Options = object;
export type Handler = (message: string, options?: Options) => void;
export type HandlerCallback = (message: string, options: any, nextHandler: Handler) => void;

export interface Handlers {
  [key: string]: Handler;
}

export let HANDLERS: Handlers = {};

export type RegisterHandlerFunc = (type: string, callback: HandlerCallback) => void;
export type InvokeFunc = (type: string, message: string, test?: boolean, options?: Options) => void;

let registerHandler: RegisterHandlerFunc = () => {};
let invoke: InvokeFunc = () => {};

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
