declare module '@ember/-internals/utils/lib/super' {
  export const checkHasSuper: (func: Function) => boolean;
  export const ROOT: () => void;
  class ObserverListenerMeta {
    listeners?: string[];
    observers?: {
      paths: string[];
      sync: boolean;
    };
  }
  export function observerListenerMetaFor(fn: Function): ObserverListenerMeta | undefined;
  export function setObservers(
    func: Function,
    observers: {
      paths: string[];
      sync: boolean;
    }
  ): void;
  export function setListeners(func: Function, listeners: string[]): void;
  /**
      Wraps the passed function so that `this._super` will point to the superFunc
      when the function is invoked. This is the primitive we use to implement
      calls to super.

      @private
      @method wrap
      @for Ember
      @param {Function} func The function to call
      @param {Function} superFunc The super function.
      @return {Function} wrapped function.
    */
  export function wrap(func: Function, superFunc: Function): Function;
  export {};
}
