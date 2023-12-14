declare module '@ember/-internals/utils/lib/spec' {
  /**
      Returns whether Type(value) is Object.

      Useful for checking whether a value is a valid WeakMap key.

      Refs: https://tc39.github.io/ecma262/#sec-typeof-operator-runtime-semantics-evaluation
            https://tc39.github.io/ecma262/#sec-weakmap.prototype.set

      @private
      @function isObject
    */
  export function isObject(value: any | null | undefined): value is object;
}
