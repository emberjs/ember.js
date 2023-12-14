declare module '@ember/debug/lib/inspect' {
  /**
     @module @ember/debug
    */
  /**
      Convenience method to inspect an object. This method will attempt to
      convert the object into a useful string description.

      It is a pretty simple implementation. If you want something more robust,
      use something like JSDump: https://github.com/NV/jsDump

      @method inspect
      @static
      @param {Object} obj The object you want to inspect.
      @return {String} A description of the object
      @since 1.4.0
      @private
    */
  export default function inspect(this: any, obj: any | null | undefined): string;
}
