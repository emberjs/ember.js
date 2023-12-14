declare module '@ember/debug/lib/handlers' {
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
  export let HANDLERS: Handlers;
  export type RegisterHandlerFunc<O extends Options> = (
    type: string,
    callback: HandlerCallback<O>
  ) => void;
  export type InvokeFunc = (
    type: string,
    message: string,
    test?: boolean,
    options?: Options
  ) => void;
  let registerHandler: <O extends object>(_type: string, _callback: HandlerCallback<O>) => void;
  let invoke: InvokeFunc;
  export { registerHandler, invoke };
}
