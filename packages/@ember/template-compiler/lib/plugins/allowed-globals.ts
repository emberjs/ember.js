/**
 * @private
 *
 * RFC: https://github.com/emberjs/rfcs/pull/1070
 *
 * Criteria for inclusion in this list:
 *
 *   Any of:
 *     - begins with an uppercase letter
 *     - guaranteed to never be added to glimmer as a keyword (e.g.: globalThis)
 *
 *   And:
 *     - must not need new to invoke
 *     - must not require lifetime management (e.g.: setTimeout)
 *     - must not be a single-word lower-case API, because of potential collision with future new HTML elements
 *     - if the API is a function, the return value should not be a promise
 *     - must be one one of these lists:
 *        - https://tc39.es/ecma262/#sec-global-object
 *        - https://tc39.es/ecma262/#sec-function-properties-of-the-global-object
 *        - https://html.spec.whatwg.org/multipage/nav-history-apis.html#window
 *        - https://html.spec.whatwg.org/multipage/indices.html#all-interfaces
 *        - https://html.spec.whatwg.org/multipage/webappapis.html
 */
export const ALLOWED_GLOBALS = new Set([
  // ////////////////
  // namespaces
  // ////////////////
  //   TC39
  'globalThis',
  'Atomics',
  'JSON',
  'Math',
  'Reflect',
  //   WHATWG
  'localStorage',
  'sessionStorage',
  'URL',
  // ////////////////
  // functions / utilities
  // ////////////////
  //   TC39
  'isNaN',
  'isFinite',
  'parseInt',
  'parseFloat',
  'decodeURI',
  'decodeURIComponent',
  'encodeURI',
  'encodeURIComponent',
  //   WHATWG
  'postMessage',
  'structuredClone',
  // ////////////////
  // new-less Constructors (still functions)
  // ////////////////
  //   TC39
  'Array', // different behavior from (array)
  'BigInt',
  'Boolean',
  'Date',
  'Number',
  'Object', // different behavior from (hash)
  'String',
  // ////////////////
  // Values
  // ////////////////
  //   TC39
  'Infinity',
  'NaN',
  //   WHATWG
  'isSecureContext',
]);
