import { DEBUG } from '@glimmer/env';

export type Options = object;
export type Handler<O extends Options> = (message: string, options?: O) => void;
export type HandlerCallback<O extends Options> = (
  message: string,
  options: O | undefined,
  nextHandler: Handler<O>
) => void;

export interface Handlers {
  [key: string]: Handler<Options>;
}

export let HANDLERS: Handlers = {};

export type RegisterHandlerFunc<O extends Options> = (
  type: string,
  callback: HandlerCallback<O>
) => void;
export type InvokeFunc = (type: string, message: string, test?: boolean, options?: Options) => void;

let registerHandler = function registerHandler<O extends Options>(
  _type: string,
  _callback: HandlerCallback<O>
) {};
let invoke: InvokeFunc = () => {};

if (DEBUG) {
  registerHandler = function registerHandler<O extends Options>(
    type: string,
    callback: HandlerCallback<O>
  ): void {
    let nextHandler: Handler<O> = HANDLERS[type] || (() => {});

    HANDLERS[type] = ((message: string, options?: O) => {
      callback(message, options, nextHandler);
    }) as Handler<Options>;
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
