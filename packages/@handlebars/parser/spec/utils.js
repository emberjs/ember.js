import { parse, print } from '../dist/esm/index.js';

let AssertError;
if (Error.captureStackTrace) {
  AssertError = function AssertError(message, caller) {
    Error.prototype.constructor.call(this, message);
    this.message = message;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, caller || AssertError);
    }
  };

  AssertError.prototype = new Error();
} else {
  AssertError = Error;
}

/**
 * @todo Use chai's expect-style API instead (`expect(actualValue).to.equal(expectedValue)`)
 * @see https://www.chaijs.com/api/bdd/
 */
export function equals(actual, expected, msg) {
  if (actual !== expected) {
    const error = new AssertError(
      `\n       Actual: ${actual}     Expected: ${expected}` +
        (msg ? `\n${msg}` : ''),
      equals
    );
    error.expected = expected;
    error.actual = actual;
    throw error;
  }
}

export function equalsAst(source, expected, options) {
  const msg = typeof options === 'string' ? options : options?.msg;
  const parserOptions =
    typeof options === 'string' ? undefined : options?.options;
  const ast = astFor(source, parserOptions);
  const padding = ` `.repeat(8);

  if (ast !== `${expected}\n`) {
    let sourceMsg = `${padding}Source: ${source}`;
    if (parserOptions) {
      let formattedOptions = printOptions(parserOptions)
        .split('\n')
        .join(`\n${padding}`);

      sourceMsg += `\n${padding}Options: ${formattedOptions}`;
    }
    const error = new AssertError(
      `\n${sourceMsg}${msg ? `\n${msg}` : ''}\n`,
      equalsAst
    );

    error.expected = expected;
    error.actual = ast;
    throw error;
  }
}

function printOptions(options) {
  if (!options) {
    return '';
  }

  let outOptions = {};

  if (options.srcName) {
    outOptions.srcName = options.srcName;
  }
  if (options.syntax) {
    outOptions.syntax = {};

    if (options.syntax.hash) {
      outOptions.syntax.hash = `{function ${
        options.syntax.hash.name ?? 'anonymous'
      }}`;
    }
    if (options.syntax.square) {
      outOptions.syntax.square = `{function ${
        options.syntax.square.name ?? 'anonymous'
      }}`;
    }
  }

  return JSON.stringify(outOptions, null, 2);
}

/**
 * @todo Use chai's expect-style API instead (`expect(actualValue).to.equal(expectedValue)`)
 * @see https://www.chaijs.com/api/bdd/#method_throw
 */
export function shouldThrow(callback, type, msg) {
  let failed;
  try {
    callback();
    failed = true;
  } catch (caught) {
    if (type && !(caught instanceof type)) {
      throw new AssertError('Type failure: ' + caught);
    }
    if (
      msg &&
      !(msg.test ? msg.test(caught.message) : msg === caught.message)
    ) {
      throw new AssertError(
        'Throw mismatch: Expected ' +
          caught.message +
          ' to match ' +
          msg +
          '\n\n' +
          caught.stack,
        shouldThrow
      );
    }
  }
  if (failed) {
    throw new AssertError('It failed to throw', shouldThrow);
  }
}
function astFor(template, options = {}) {
  let ast = parse(template, options);
  return print(ast);
}
