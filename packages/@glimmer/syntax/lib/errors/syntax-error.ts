import * as AST from '../types/nodes';

/*
 * Subclass of `Error` with additional information
 * about location of incorrect markup.
 */
class SyntaxError {
  message: string;
  stack: string;
  location: AST.SourceLocation;

  constructor(message: string, location: AST.SourceLocation) {
    let error = Error.call(this, message);

    this.message = message;
    this.stack = error.stack;
    this.location = location;
  }
}

SyntaxError.prototype = Object.create(Error.prototype);

export default SyntaxError;
