import { DEBUG } from '@glimmer/env';

const EMPTY_ARRAY = readonly([]);
function readonly(value) {
  if (DEBUG) {
    return Object.freeze(value);
  }
  return value;
}
function emptyArray() {
  return EMPTY_ARRAY;
}
const EMPTY_STRING_ARRAY = emptyArray();
const EMPTY_NUMBER_ARRAY = emptyArray();

/**
 * This function returns `true` if the input array is the special empty array sentinel,
 * which is sometimes used for optimizations.
 */
function isEmptyArray(input) {
  return input === EMPTY_ARRAY;
}

/**
 * This function does a better job of narrowing values to arrays (including readonly arrays) than
 * the default Array.isArray.
 */
function isArray(value) {
  return Array.isArray(value);
}
function* times(count) {
  for (let i = 0; i < count; i++) {
    yield i;
  }
}

/**
 * Returns an array of numbers from `start` up to `end` (inclusive)
 */
function* range(start, end) {
  for (let i = start; i <= end; i++) {
    yield i;
  }
}
function* reverse(input) {
  for (let i = input.length - 1; i >= 0; i--) {
    yield input[i];
  }
}
function* enumerate(input) {
  let i = 0;
  for (const item of input) {
    yield [i++, item];
  }
}
function* enumerateReverse(input) {
  for (let i = input.length - 1; i >= 0; i--) {
    yield [i, input[i]];
  }
}
function* zip(left, right) {
  for (const [i, item] of enumerate(left)) {
    yield [item, right[i]];
  }
  const excessStart = left.length;
  for (const item of right.slice(excessStart)) {
    yield [undefined, item];
  }
}

function dict() {
  return Object.create(null);
}
function isDict(u) {
  return u !== null && u !== undefined;
}
function isObject(u) {
  return typeof u === 'function' || typeof u === 'object' && u !== null;
}
function isIndexable(u) {
  return isObject(u);
}

const IS_COMPILABLE_TEMPLATE = Symbol('IS_COMPILABLE_TEMPLATE');
function isCompilable(value) {
  return !!(value && typeof value === 'object' && IS_COMPILABLE_TEMPLATE in value);
}

/* eslint-disable no-console */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const LOCAL_DEBUG = false ;
const LOCAL_TRACE_LOGGING = hasFlag();
const LOCAL_EXPLAIN_LOGGING = hasFlag();
const LOCAL_INTERNALS_LOGGING = hasFlag();
const LOCAL_SUBTLE_LOGGING = hasFlag();
if (LOCAL_INTERNALS_LOGGING || LOCAL_EXPLAIN_LOGGING) {
  console.group('%cLogger Flags:', 'font-weight: normal; color: teal');
  log('LOCAL_DEBUG', LOCAL_DEBUG, 'Enables debug logging for people working on this repository. If this is off, none of the other flags will do anything.');
  log('LOCAL_TRACE_LOGGING', LOCAL_TRACE_LOGGING, `Enables trace logging. This is most useful if you're working on the internals, and includes a trace of compiled templates and a trace of VM execution that includes state changes. If you want to see all of the state, enable LOCAL_SUBTLE_LOGGING.`);
  log('LOCAL_EXPLAIN_LOGGING', LOCAL_EXPLAIN_LOGGING, 'Enables trace explanations (like this one!)');
  log('LOCAL_INTERNALS_LOGGING', LOCAL_INTERNALS_LOGGING, `Enables logging of internal state. This is most useful if you're working on the debug infrastructure itself.`);
  log('LOCAL_SUBTLE_LOGGING', LOCAL_SUBTLE_LOGGING, 'Enables more complete logging, even when the result would be extremely verbose and not usually necessary. Subtle logs are dimmed when enabled.');
  log('audit_logging', getFlag(), 'Enables specific audit logs. These logs are useful during an internal refactor and can help pinpoint exactly where legacy code is being used (e.g. infallible_deref and throwing_deref).');
  log('focus_highlight', getFlag(), `Enables focus highlighting of specific trace logs. This makes it easy to see specific aspects of the trace at a glance.`);
  console.log();
  console.groupEnd();
  function log(flag, value, explanation) {
    const {
      formatted,
      style
    } = format(value);
    const header = [`%c[${flag}]%c %c${formatted}`, `font-weight: normal; background-color: ${style}; color: white`, ``, `font-weight: normal; color: ${style}`];
    if (LOCAL_EXPLAIN_LOGGING) {
      console.group(...header);
      console.log(`%c${explanation}`, 'color: grey');
      console.groupEnd();
    } else {
      console.log(...header);
    }
  }
  function format(flagValue) {
    if (flagValue === undefined || flagValue === false) {
      return {
        formatted: 'off',
        style: 'grey'
      };
    } else if (flagValue === true) {
      return {
        formatted: 'on',
        style: 'green'
      };
    } else if (typeof flagValue === 'string') {
      return {
        formatted: flagValue,
        style: 'blue'
      };
    } else if (Array.isArray(flagValue)) {
      if (flagValue.length === 0) {
        return {
          formatted: 'none',
          style: 'grey'
        };
      }
      return {
        formatted: `[${flagValue.join(', ')}]`,
        style: 'teal'
      };
    } else {
      assertNever();
    }
  }
  function assertNever(_never) {
    throw new Error('unreachable');
  }
}

// This function should turn into a constant `return false` in `!DEBUG`,
// which should inline properly via terser, swc and esbuild.
//
// https://tiny.katz.zone/BNqN3F
function hasFlag(flag) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  {
    return false;
  }
}
function getFlag(flag) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  {
    return undefined;
  }
}

/**
 * This constant exists to make it easier to differentiate normal logs from
 * errant console.logs. LOCAL_LOGGER should only be used inside a
 * LOCAL_SHOULD_LOG check.
 *
 * It does not alleviate the need to check LOCAL_SHOULD_LOG, which is used
 * for stripping.
 */

const LOCAL_LOGGER = console;
/**
 * This constant exists to make it easier to differentiate normal logs from
 * errant console.logs. LOGGER can be used outside of LOCAL_SHOULD_LOG checks,
 * and is meant to be used in the rare situation where a console.* call is
 * actually appropriate.
 */

const LOGGER = console;
function assertNever(value, desc = 'unexpected unreachable branch') {
  LOGGER.log('unreachable', value);
  LOGGER.log(`${desc} :: ${JSON.stringify(value)} (${value})`);
  throw new Error(`code reached unreachable`);
}

function unwrap(value) {
  assert(value !== null && value !== undefined, 'expected value to be present');
  return value;
}
function expect(value, message) {
  assert(value !== null && value !== undefined, message);
  return value;
}
function assert(condition, msg) {
  if (DEBUG) {
    if (!condition) {
      throw new Error(msg || 'assertion failure');
    }
  }
}
function deprecate(desc) {
  LOCAL_LOGGER.warn(`DEPRECATION: ${desc}`);
}
let DevMode;
if (DEBUG) {
  DevMode = class DevMode {
    static value(devmode) {
      expect(devmode, `Expected value to be present in development mode`);
      return devmode.#value;
    }
    #value;
    constructor(val) {
      assert(val !== undefined, `You cannot put undefined in a DevMode`);
      this.#value = val;
    }

    /**
     * Even though eslint will still yell at us, let's get `String(DevMode<string>)` to produce the
     * underlying string.
     */
    toString() {
      return String(this.#value);
    }
  };
}
/**
 * This function returns a `DevModeInterface`. It takes an arrow function to ensure that the
 * expression is stripped in production.
 */
function devmode(value) {
  if (DEBUG) {
    return intoDevMode(value());
  }
  return undefined;
}

/**
 * This function is useful if the value in question is a function and the prod-mode version of the
 * function can be successfully inlined.
 *
 * The constraint `Prod extends Dev` allows `Prod` to have fewer arguments than `Dev`, but only at
 * the end.
 */
function enhancedDevmode(prod, dev) {
  if (DEBUG) {
    return dev;
  } else {
    return prod;
  }
}
function intoDevMode(devmodeValue) {
  return devmodeValue instanceof DevMode ? devmodeValue : new DevMode(devmodeValue);
}

/**
 * The first parameter is an arrow so an expression that pulls out a devmode value is always removed
 * outside of dev mode.
 */
function mapDevmode(value, map) {
  if (DEBUG) {
    const devmodeValue = inDevmode(value());
    const innerValue = devmodeValue instanceof DevMode ? DevMode.value(devmodeValue) : devmodeValue;
    return intoDevMode(map(innerValue));
  }
  return undefined;
}

/**
 * The first parameter is an arrow so an expression that pulls out a devmode value is always removed
 * outside of dev mode.
 */
function devmodeOr(value, inProd) {
  if (DEBUG) {
    return inDevmode(value());
  } else {
    return inProd;
  }
}

/**
 * A version of unwrap that is meant to be used in development mode (inside an `DEBUG`
 * guard).
 */
function inDevmode(devmode) {
  if (DEBUG) {
    assert(DevMode, `Expected the DevMode class to be present in development mode`);
    assert(devmode && devmode instanceof DevMode, `Expected value to be present in development mode`);
    return DevMode.value(devmode);
  } else {
    throw Error(`You shouldn't use devmode values in production mode. This function should even be present in production mode (it should be stripped due to lack of use), so something is wrong.`);
  }
}

/// <reference types="qunit" />

let beginTestSteps;
let endTestSteps;
let verifySteps;
let logStep;

let debugToString;
if (DEBUG) {
  let getFunctionName = fn => {
    let functionName = fn.name;
    if (functionName === undefined) {
      let match = /function (\w+)\s*\(/u.exec(String(fn));
      functionName = match && match[1] || '';
    }
    return functionName.replace(/^bound /u, '');
  };
  let getObjectName = obj => {
    let name;
    let className;
    if (obj.constructor && typeof obj.constructor === 'function') {
      className = getFunctionName(obj.constructor);
    }
    if ('toString' in obj && obj.toString !== Object.prototype.toString && obj.toString !== Function.prototype.toString) {
      name = obj.toString();
    }

    // If the class has a decent looking name, and the `toString` is one of the
    // default Ember toStrings, replace the constructor portion of the toString
    // with the class name. We check the length of the class name to prevent doing
    // this when the value is minified.
    if (name && /<.*:ember\d+>/u.test(name) && className && className[0] !== '_' && className.length > 2 && className !== 'Class') {
      return name.replace(/<.*:/u, `<${className}:`);
    }
    return name || className;
  };
  let getPrimitiveName = value => {
    return String(value);
  };
  debugToString = value => {
    if (typeof value === 'function') {
      return getFunctionName(value) || `(unknown function)`;
    } else if (typeof value === 'object' && value !== null) {
      return getObjectName(value) || `(unknown object)`;
    } else {
      return getPrimitiveName(value);
    }
  };
}
var debugToString$1 = debugToString;

function stringifyDebugLabel(described) {
  return mapDevmode(() => described.description, debug => {
    return stringifyChildLabel(...debug.label);
  });
}
function stringifyChildLabel(...parts) {
  assert(parts.every(part => typeof part === 'string' || typeof part === 'symbol'), `Expected all parts to be strings or symbols`);
  const [first, ...rest] = parts;
  let out = first;
  for (const part of rest) {
    if (typeof part === 'string') {
      if (/^\p{XID_Start}\p{XID_Continue}*$/u.test(part)) {
        out += `.${part}`;
      } else {
        out += `[${JSON.stringify(part)}]`;
      }
    } else {
      out += `[${String(part)}]`;
    }
  }
  return out;
}

/**
 * Using this function ensures that the `object.description` expression always gets stripped.
 */
function getDescription(object) {
  return mapDevmode(() => object.description, desc => desc);
}
function createWithDescription(create, description) {
  const object = create();
  setDescription(object, description);
  return object;
}

/**
 * Using this function ensures that the `object.description = value` statement always gets stripped.
 */

function setDescription(object, description) {
  if (DEBUG) {
    object.description = description;
  }
}
function toLabel(spec, defaultLabel) {
  return devmode(() => {
    if (!spec) return defaultLabel;
    if (typeof spec === 'string') {
      return [spec];
    } else {
      return spec;
    }
  });
}
function toValidatableDescription(spec, defaults) {
  return mapDevmode(() => defaults, defaults => {
    if (!isObject(spec) || isArray(spec)) {
      return {
        ...defaults,
        label: inDevmode(toLabel(spec, defaults.label))
      };
    } else {
      return {
        ...defaults,
        ...spec,
        label: typeof spec.label === 'string' ? [spec.label] : spec.label
      };
    }
  });
}

function clearElement(parent) {
  let current = parent.firstChild;
  while (current) {
    let next = current.nextSibling;
    parent.removeChild(current);
    current = next;
  }
}

const RAW_NODE = -1;
const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const COMMENT_NODE = 8;
const DOCUMENT_NODE = 9;
const DOCUMENT_TYPE_NODE = 10;
const DOCUMENT_FRAGMENT_NODE = 11;
const NS_HTML = 'http://www.w3.org/1999/xhtml';
const NS_MATHML = 'http://www.w3.org/1998/Math/MathML';
const NS_SVG = 'http://www.w3.org/2000/svg';
const NS_XLINK = 'http://www.w3.org/1999/xlink';
const NS_XML = 'http://www.w3.org/XML/1998/namespace';
const NS_XMLNS = 'http://www.w3.org/2000/xmlns/';
const INSERT_BEFORE_BEGIN = 'beforebegin';
const INSERT_AFTER_BEGIN = 'afterbegin';
const INSERT_BEFORE_END = 'beforeend';
const INSERT_AFTER_END = 'afterend';

function isUserException(error) {
  return error instanceof UserException;
}
function isError(value) {
  return isObject(value) && value instanceof Error;
}
class EarlyError extends Error {
  static reactive(message, reactive) {
    return new EarlyError(message, reactive);
  }
  reactive;
  constructor(message, reactive = null) {
    super(fullMessage(message, reactive));
    this.reactive = reactive;
  }
}
function fullMessage(message, reactive) {
  const label = reactive ? stringifyDebugLabel(reactive) : null;
  if (label && message.includes('%r')) {
    return message.replace('%r', `(${label})`);
  } else {
    return message;
  }
}
class UserException extends Error {
  static from(exception, defaultMessage) {
    if (isObject(exception) && exception instanceof UserException) {
      return exception;
    } else {
      return new UserException(exception, defaultMessage);
    }
  }
  #error;
  #exception;
  constructor(exception, defaultMessage) {
    const error = isError(exception) ? exception : undefined;
    const message = error?.message ?? defaultMessage;
    super(message);
    if (error) {
      this.#error = error;
      this.cause = error;
    } else {
      this.#error = undefined;
    }
  }
  get error() {
    return this.#error;
  }
  get exception() {
    return this.#exception;
  }
}

/*
  Encoding notes

  We use 30 bit integers for encoding, so that we don't ever encode a non-SMI
  integer to push on the stack.

  Handles are >= 0
  Immediates are < 0

  True, False, Undefined and Null are pushed as handles into the symbol table,
  with well known handles (0, 1, 2, 3)

  The negative space is divided into positives and negatives. Positives are
  higher numbers (-1, -2, -3, etc), negatives are lower.

  We only encode immediates for two reasons:

  1. To transfer over the wire, so they're smaller in general
  2. When pushing values onto the stack from the low level/inner VM, which may
     be converted into WASM one day.

  This allows the low-level VM to always use SMIs, and to minimize using JS
  values via handles for things like the stack pointer and frame pointer.
  Externally, most code pushes values as JS values, except when being pulled
  from the append byte code where it was already encoded.

  Logically, this is because the low level VM doesn't really care about these
  higher level values. For instance, the result of a userland helper may be a
  number, or a boolean, or undefined/null, but it's extra work to figure that
  out and push it correctly, vs. just pushing the value as a JS value with a
  handle.

  Note: The details could change here in the future, this is just the current
  strategy.
*/

const MAX_SMI = 2 ** 30 - 1;
const MIN_SMI = ~MAX_SMI;
const SIGN_BIT = ~(2 ** 29);
const MAX_INT = ~SIGN_BIT - 1;
const MIN_INT = ~MAX_INT;
const FALSE_HANDLE = 0;
const TRUE_HANDLE = 1;
const NULL_HANDLE = 2;
const UNDEFINED_HANDLE = 3;
const ENCODED_UNDEFINED_HANDLE = UNDEFINED_HANDLE;
function isHandle(value) {
  return value >= 0;
}
function isNonPrimitiveHandle(value) {
  return value > ENCODED_UNDEFINED_HANDLE;
}
function constants(...values) {
  return [false, true, null, undefined, ...values];
}
function isSmallInt(value) {
  return value % 1 === 0 && value <= MAX_INT && value >= MIN_INT;
}
function encodeNegative(num) {
  return num & SIGN_BIT;
}
function decodeNegative(num) {
  return num | ~SIGN_BIT;
}
function encodePositive(num) {
  return ~num;
}
function decodePositive(num) {
  return ~num;
}
function encodeBoolean(bool) {
  return bool | 0;
}
function decodeBoolean(num) {
  return !!num;
}
function encodeHandle(num) {
  return num;
}
function decodeHandle(num) {
  return num;
}
function encodeImmediate(num) {
  num |= 0;
  return num < 0 ? encodeNegative(num) : encodePositive(num);
}
function decodeImmediate(num) {
  num |= 0;
  return num > SIGN_BIT ? decodePositive(num) : decodeNegative(num);
}
[1, -1].forEach(x => decodeImmediate(encodeImmediate(x)));

/**
  Strongly hint runtimes to intern the provided string.

  When do I need to use this function?

  For the most part, never. Pre-mature optimization is bad, and often the
  runtime does exactly what you need it to, and more often the trade-off isn't
  worth it.

  Why?

  Runtimes store strings in at least 2 different representations:
  Ropes and Symbols (interned strings). The Rope provides a memory efficient
  data-structure for strings created from concatenation or some other string
  manipulation like splitting.

  Unfortunately checking equality of different ropes can be quite costly as
  runtimes must resort to clever string comparison algorithms. These
  algorithms typically cost in proportion to the length of the string.
  Luckily, this is where the Symbols (interned strings) shine. As Symbols are
  unique by their string content, equality checks can be done by pointer
  comparison.

  How do I know if my string is a rope or symbol?

  Typically (warning general sweeping statement, but truthy in runtimes at
  present) static strings created as part of the JS source are interned.
  Strings often used for comparisons can be interned at runtime if some
  criteria are met.  One of these criteria can be the size of the entire rope.
  For example, in chrome 38 a rope longer then 12 characters will not
  intern, nor will segments of that rope.

  Some numbers: http://jsperf.com/eval-vs-keys/8

  Known Trick™

  @private
  @return {String} interned version of the provided string
*/
function intern(str) {
  let obj = {};
  obj[str] = 1;
  for (let key in obj) {
    if (key === str) {
      return key;
    }
  }
  return str;
}

const SERIALIZATION_FIRST_NODE_STRING = '%+b:0%';
function isSerializationFirstNode(node) {
  return node.nodeValue === SERIALIZATION_FIRST_NODE_STRING;
}

let assign = Object.assign;
function fillNulls(count) {
  let arr = new Array(count);
  for (let i = 0; i < count; i++) {
    arr[i] = null;
  }
  return arr;
}
function array() {
  return {
    allocate: size => fillNulls(size)
  };
}
function values(obj) {
  return Object.values(obj);
}
function entries(dict) {
  return Object.entries(dict);
}
function mapDict(dict, mapper) {
  return Object.fromEntries(entries(dict).map(([k, v]) => [k, mapper(v)]));
}

function keys(obj) {
  return Object.keys(obj);
}
function unreachable(message) {
  if (DEBUG) {
    throw new Error(message ?? 'unreachable');
  }
}
function exhausted(value) {
  if (DEBUG) {
    throw new Error(`Exhausted ${String(value)}`);
  }
}

/**
 * https://tiny.katz.zone/EhdPZQ
 */
function Never() {
  return undefined;
}

function isPresent(value) {
  return value !== null && value !== undefined;
}
function assertPresent(value, message) {
  if (!isPresent(value)) {
    throw new Error(`Expected present, got ${typeof value === 'string' ? value : message}`);
  }
}
function isPresentArray(list) {
  return list.length > 0;
}
function ifPresent(list, ifPresent, otherwise) {
  if (isPresentArray(list)) {
    return ifPresent(list);
  } else {
    return otherwise();
  }
}
function arrayToOption(list) {
  if (isPresentArray(list)) {
    return list;
  } else {
    return null;
  }
}
function assertPresentArray(list, message = `unexpected empty list`) {
  if (!isPresentArray(list)) {
    throw new Error(message);
  }
}
function asPresentArray(list, message = `unexpected empty list`) {
  assertPresentArray(list, message);
  return list;
}
function getLast(list) {
  return list.length === 0 ? undefined : list[list.length - 1];
}
function getFirst(list) {
  return list.length === 0 ? undefined : list[0];
}
function mapPresentArray(list, mapper) {
  if (list === null) {
    return null;
  }
  let out = [];
  for (let item of list) {
    out.push(mapper(item));
  }
  return out;
}

function Ok(value) {
  return {
    type: 'ok',
    value
  };
}
function Err(value) {
  return {
    type: 'err',
    value
  };
}
function Results(results) {
  const values = [];
  for (const result of results) {
    if (result.type === 'err') {
      return result;
    }
    values.push(result.value);
  }
  return {
    type: 'ok',
    value: values
  };
}
function chainResult(value, mapper) {
  return value.type === 'ok' ? mapper(value.value) : value;
}
function flattenResult(value) {
  return value.type === 'ok' ? value.value : value;
}
function mapResult(value, mapper) {
  if (value.type === 'ok') {
    return {
      type: 'ok',
      value: mapper(value.value)
    };
  } else {
    return value;
  }
}

// @audit almost all uses of these outside of tests aren't correct
function unwrapResult(value) {
  switch (value.type) {
    case 'err':
      throw value.value;
    case 'ok':
      return value.value;
  }
}

function castToSimple(node) {
  if (node === null) return null;
  if (isDocument(node)) {
    return node;
  } else if (isSimpleElement(node)) {
    return node;
  } else {
    return node;
  }
}

// If passed a document, verify we're in the browser and return it as a Document

// If we don't know what this is, but the check requires it to be an element,
// the cast will mandate that it's a browser element

// Finally, if it's a more generic check, the cast will mandate that it's a
// browser node and return a BrowserNodeUtils corresponding to the check

function castToBrowser(node, sugaryCheck) {
  if (node === null || node === undefined) {
    return null;
  }
  if (typeof document === 'undefined') {
    throw new Error('Attempted to cast to a browser node in a non-browser context');
  }
  if (isDocument(node)) {
    return node;
  }
  if (node.ownerDocument !== document) {
    throw new Error('Attempted to cast to a browser node with a node that was not created from this document');
  }
  return checkBrowserNode(node, sugaryCheck);
}
function checkError(from, check) {
  return new Error(`cannot cast a ${from} into ${String(check)}`);
}
function isDocument(node) {
  return node.nodeType === DOCUMENT_NODE;
}
function isSimpleElement(node) {
  return node?.nodeType === ELEMENT_NODE;
}
function isElement(node) {
  return node?.nodeType === ELEMENT_NODE && node instanceof Element;
}
function checkBrowserNode(node, check) {
  let isMatch = false;
  if (node !== null) {
    if (typeof check === 'string') {
      isMatch = stringCheckNode(node, check);
    } else if (Array.isArray(check)) {
      isMatch = check.some(c => stringCheckNode(node, c));
    } else {
      throw unreachable();
    }
  }
  if (isMatch && node instanceof Node) {
    return node;
  } else {
    throw checkError(`SimpleElement(${node?.constructor?.name ?? 'null'})`, check);
  }
}
function stringCheckNode(node, check) {
  switch (check) {
    case 'NODE':
      return true;
    case 'HTML':
      return node instanceof HTMLElement;
    case 'SVG':
      return node instanceof SVGElement;
    case 'ELEMENT':
      return node instanceof Element;
    default:
      if (check.toUpperCase() === check) {
        throw new Error(`BUG: this code is missing handling for a generic node type`);
      }
      return node instanceof Element && node.tagName.toLowerCase() === check;
  }
}

class AbstractStack {
  #stack;
  #parent;
  constructor(stack, parent, label) {
    this.#stack = stack;
    this.#parent = parent;
    if (DEBUG) {
      this.label = label;
    }
  }
  get debug() {
    const parentFrames = this.#parent?.debug.frames ?? [];
    return {
      frames: [...parentFrames, {
        label: this.label ?? 'stack',
        values: this.#stack
      }]
    };
  }
  *[Symbol.iterator]() {
    yield* this.#stack;
  }
  get current() {
    if (this.#stack.length === 0 && this.#parent) {
      return this.#parent.current;
    }
    return this.#stack.at(-1) ?? null;
  }
  get size() {
    return this.#stack.length + (this.#parent ? this.#parent.size : 0);
  }
  get hasParent() {
    return !!this.#parent;
  }
  get frameHasItems() {
    return this.#stack.length > 0;
  }
  begin() {
    return this.child();
  }
  catch() {
    assert(this.#parent, `${this.label ?? 'Stack'}: Expected a parent frame in unwind`);
    return this.#parent;
  }
  finally() {
    assert(this.#stack.length === 0, `${this.label ?? 'Stack'}: Expected an empty frame in finally `);
    assert(this.#parent, `${this.label ?? 'Stack'}: Expected a parent frame in finally`);
    return this.#parent;
  }
  push(item) {
    this.#stack.push(item);
  }
  pop() {
    assert(
    // this is annoying but we need to write it this way to get good errors and get `asserts
    // condition` to work correctly.
    !(!this.frameHasItems && this.#parent), `BUG: Unbalanced frame in ${this.label ?? 'stack'}: attempted to pop an item but no item was pushed. Call unwind() or finally() first`);
    assert(this.frameHasItems, `BUG: Unbalanced ${this.label ?? 'stack'}: attempted to pop an item but no item was pushed`);
    return this.#stack.pop() ?? null;
  }
  nth(from) {
    assert(from < this.size, `Index ${from} is out of bounds`);
    if (from < this.#stack.length) {
      return this.#stack.at(-from - 1);
    } else if (this.#parent) {
      return this.#parent.nth(from - this.#stack.length);
    } else {
      return null;
    }
  }
  toArray() {
    const prefix = this.#parent ? [...this.#parent.toArray()] : [];
    return [...prefix, ...this.#stack];
  }
}
class StackImpl extends AbstractStack {
  static empty(label) {
    return new StackImpl([], null, label);
  }
  child() {
    return new StackImpl([], this, this.label);
  }
}

/**
 * A balanced stack is allowed to be empty, but it should never be popped unless there's something
 * in it.
 */

class BalancedStack extends AbstractStack {
  static empty(label) {
    return DEBUG ? new BalancedStack([], null, label ?? 'balanced stack') : new BalancedStack([], null);
  }
  static initial(value, label) {
    return DEBUG ? new BalancedStack([value], null, label) : new BalancedStack([value], null);
  }
  child() {
    return new BalancedStack([], this, this.label);
  }
  get present() {
    assert(this.current, `BUG: Expected an item in the ${this.label ?? 'stack'}`);
    return this.current;
  }
}
class PresentStack extends AbstractStack {
  static initial(value, label) {
    return DEBUG ? new PresentStack([value], null, label ?? 'present stack') : new PresentStack([value], null);
  }
  child() {
    return new PresentStack([], this, this.label);
  }
  pop() {
    try {
      return super.pop();
    } finally {
      assert(super.size > 0, `BUG: You should never pop the last item from a ${this.label ?? 'PresentStack'}`);
    }
  }
}
const Stack = StackImpl;
function parentDebugFrames(label, aspects) {
  const record = mapDict(aspects, v => unwrap(v.debug).frames);
  const frames = [];
  for (const [i, [k, aspectFrames]] of enumerate(entries(record))) {
    if (i >= frames.length) {
      frames.push({
        label,
        aspects: {}
      });
    }
    const frame = unwrap(frames[i]);
    const aspectFrame = aspectFrames[i];
    if (aspectFrame) {
      frame.aspects[k] = aspectFrame;
    } else {
      LOCAL_LOGGER.warn(`didn't find frames for ${k}`);
    }
  }
  return {
    label,
    frames: frames
  };
}

function strip(strings, ...args) {
  let out = '';
  for (const [i, string] of enumerate(strings)) {
    let dynamic = args[i] !== undefined ? String(args[i]) : '';
    out += `${string}${dynamic}`;
  }
  let lines = out.split('\n');
  while (isPresentArray(lines) && /^\s*$/u.test(getFirst(lines))) {
    lines.shift();
  }
  while (isPresentArray(lines) && /^\s*$/u.test(getLast(lines))) {
    lines.pop();
  }
  let min = Infinity;
  for (let line of lines) {
    let leading = /^\s*/u.exec(line)[0].length;
    min = Math.min(min, leading);
  }
  let stripped = [];
  for (let line of lines) {
    stripped.push(line.slice(min));
  }
  return stripped.join('\n');
}

function unwrapHandle(handle) {
  if (typeof handle === 'number') {
    return handle;
  } else {
    let error = handle.errors[0];
    throw new Error(`Compile Error: ${error.problem} @ ${error.span.start}..${error.span.end}`);
  }
}
function unwrapTemplate(template) {
  if (template.result === 'error') {
    throw new Error(`Compile Error: ${template.problem} @ ${template.span.start}..${template.span.end}`);
  }
  return template;
}
function extractHandle(handle) {
  if (typeof handle === 'number') {
    return handle;
  } else {
    return handle.handle;
  }
}
function isOkHandle(handle) {
  return typeof handle === 'number';
}
function isErrHandle(handle) {
  return typeof handle === 'number';
}

function buildUntouchableThis(source) {
  let context = null;
  if (DEBUG) {
    let assertOnProperty = property => {
      let access = typeof property === 'symbol' || typeof property === 'number' ? `[${String(property)}]` : `.${property}`;
      throw new Error(`You accessed \`this${access}\` from a function passed to the ${source}, but the function itself was not bound to a valid \`this\` context. Consider updating to use a bound function (for instance, use an arrow function, \`() => {}\`).`);
    };
    context = new Proxy({}, {
      get(_target, property) {
        assertOnProperty(property);
      },
      set(_target, property) {
        assertOnProperty(property);
        return false;
      },
      has(_target, property) {
        assertOnProperty(property);
        return false;
      }
    });
  }
  return context;
}

const NODE_TYPE = {
  ELEMENT: 1,
  RAW: -1,
  TEXT: 3,
  COMMENT: 8,
  DOCUMENT: 9,
  DOCUMENT_TYPE: 10,
  DOCUMENT_FRAGMENT: 11
};

export { BalancedStack, COMMENT_NODE, DOCUMENT_FRAGMENT_NODE, DOCUMENT_NODE, DOCUMENT_TYPE_NODE, ELEMENT_NODE, EMPTY_ARRAY, EMPTY_NUMBER_ARRAY, EMPTY_STRING_ARRAY, EarlyError, Err, FALSE_HANDLE, INSERT_AFTER_BEGIN, INSERT_AFTER_END, INSERT_BEFORE_BEGIN, INSERT_BEFORE_END, IS_COMPILABLE_TEMPLATE, LOCAL_LOGGER, LOGGER, MAX_INT, MAX_SMI, MIN_INT, MIN_SMI, NODE_TYPE, NS_HTML, NS_MATHML, NS_SVG, NS_XLINK, NS_XML, NS_XMLNS, NULL_HANDLE, Never, Ok, PresentStack, RAW_NODE, Results, SERIALIZATION_FIRST_NODE_STRING, Stack, StackImpl, TEXT_NODE, TRUE_HANDLE, UNDEFINED_HANDLE, UserException, array, arrayToOption, asPresentArray, assert, assertNever, assertPresent, assertPresentArray, assign, beginTestSteps, buildUntouchableThis, castToBrowser, castToSimple, chainResult, checkBrowserNode as checkNode, clearElement, constants, createWithDescription, debugToString$1 as debugToString, decodeBoolean, decodeHandle, decodeImmediate, decodeNegative, decodePositive, deprecate, devmode, devmodeOr, dict, emptyArray, encodeBoolean, encodeHandle, encodeImmediate, encodeNegative, encodePositive, endTestSteps, enhancedDevmode, entries, enumerate, enumerateReverse, exhausted, expect, extractHandle, fillNulls, flattenResult, getDescription, getFirst, getLast, ifPresent, inDevmode, intern, isArray, isCompilable, isDict, isElement, isEmptyArray, isErrHandle, isError, isHandle, isIndexable, isNonPrimitiveHandle, isObject, isOkHandle, isPresent, isPresentArray, isSerializationFirstNode, isSimpleElement, isSmallInt, isUserException, keys, logStep, mapDevmode, mapPresentArray, mapResult, parentDebugFrames, range, reverse, setDescription, stringifyChildLabel, stringifyDebugLabel, strip, times, toLabel, toValidatableDescription, unreachable, unwrap, unwrapHandle, unwrapResult, unwrapTemplate, values, verifySteps, zip };
