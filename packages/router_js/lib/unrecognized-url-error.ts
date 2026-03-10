export interface UnrecognizedURLConstructor {
  new (message?: string): UnrecognizedURLError;
  readonly prototype: UnrecognizedURLError;
}

export interface UnrecognizedURLError extends Error {
  constructor: UnrecognizedURLConstructor;
}

const UnrecognizedURLError: UnrecognizedURLConstructor = (function () {
  UnrecognizedURLError.prototype = Object.create(Error.prototype);
  UnrecognizedURLError.prototype.constructor = UnrecognizedURLError;

  function UnrecognizedURLError(this: UnrecognizedURLError, message?: string) {
    let error = Error.call(this, message);
    this.name = 'UnrecognizedURLError';
    this.message = message || 'UnrecognizedURL';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UnrecognizedURLError);
    } else {
      this.stack = error.stack;
    }
  }

  return UnrecognizedURLError as any;
})();

export default UnrecognizedURLError;
