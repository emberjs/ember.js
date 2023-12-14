import { DEBUG } from '@glimmer/env';

const EMPTY_ARRAY = Object.freeze([]);
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

// import Logger from './logger';


// let alreadyWarned = false;

function debugAssert(test, msg) {
  // if (!alreadyWarned) {
  //   alreadyWarned = true;
  //   Logger.warn("Don't leave debug assertions on in public builds");
  // }

  if (!test) {
    throw new Error(msg || 'assertion failure');
  }
}
function deprecate(desc) {
  LOCAL_LOGGER.warn(`DEPRECATION: ${desc}`);
}

function keys(obj) {
  return Object.keys(obj);
}
function unwrap(val) {
  if (val === null || val === undefined) throw new Error(`Expected value to be present`);
  return val;
}
function expect(val, message) {
  if (val === null || val === undefined) throw new Error(message);
  return val;
}
function unreachable(message = 'unreachable') {
  return new Error(message);
}
function exhausted(value) {
  throw new Error(`Exhausted ${String(value)}`);
}
const tuple = (...args) => args;

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

function dict() {
  return Object.create(null);
}
function isDict(u) {
  return u !== null && u !== undefined;
}
function isObject(u) {
  return typeof u === 'function' || typeof u === 'object' && u !== null;
}
class StackImpl {
  stack;
  current = null;
  constructor(values = []) {
    this.stack = values;
  }
  get size() {
    return this.stack.length;
  }
  push(item) {
    this.current = item;
    this.stack.push(item);
  }
  pop() {
    let item = this.stack.pop();
    this.current = getLast(this.stack) ?? null;
    return item === undefined ? null : item;
  }
  nth(from) {
    let len = this.stack.length;
    return len < from ? null : unwrap(this.stack[len - from]);
  }
  isEmpty() {
    return this.stack.length === 0;
  }
  toArray() {
    return this.stack;
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

let ImmediateConstants = /*#__PURE__*/function (ImmediateConstants) {
  ImmediateConstants[ImmediateConstants["MAX_SMI"] = 1073741823] = "MAX_SMI";
  ImmediateConstants[ImmediateConstants["MIN_SMI"] = -1073741824] = "MIN_SMI";
  ImmediateConstants[ImmediateConstants["SIGN_BIT"] = -536870913] = "SIGN_BIT";
  ImmediateConstants[ImmediateConstants["MAX_INT"] = 536870911] = "MAX_INT";
  ImmediateConstants[ImmediateConstants["MIN_INT"] = -536870912] = "MIN_INT";
  ImmediateConstants[ImmediateConstants["FALSE_HANDLE"] = 0] = "FALSE_HANDLE";
  ImmediateConstants[ImmediateConstants["TRUE_HANDLE"] = 1] = "TRUE_HANDLE";
  ImmediateConstants[ImmediateConstants["NULL_HANDLE"] = 2] = "NULL_HANDLE";
  ImmediateConstants[ImmediateConstants["UNDEFINED_HANDLE"] = 3] = "UNDEFINED_HANDLE";
  ImmediateConstants[ImmediateConstants["ENCODED_FALSE_HANDLE"] = 0] = "ENCODED_FALSE_HANDLE";
  ImmediateConstants[ImmediateConstants["ENCODED_TRUE_HANDLE"] = 1] = "ENCODED_TRUE_HANDLE";
  ImmediateConstants[ImmediateConstants["ENCODED_NULL_HANDLE"] = 2] = "ENCODED_NULL_HANDLE";
  ImmediateConstants[ImmediateConstants["ENCODED_UNDEFINED_HANDLE"] = 3] = "ENCODED_UNDEFINED_HANDLE";
  return ImmediateConstants;
}({});
function isHandle(value) {
  return value >= 0;
}
function isNonPrimitiveHandle(value) {
  return value > ImmediateConstants.ENCODED_UNDEFINED_HANDLE;
}
function constants(...values) {
  return [false, true, null, undefined, ...values];
}
function isSmallInt(value) {
  return value % 1 === 0 && value <= ImmediateConstants.MAX_INT && value >= ImmediateConstants.MIN_INT;
}
function encodeNegative(num) {
  return num & ImmediateConstants.SIGN_BIT;
}
function decodeNegative(num) {
  return num | ~ImmediateConstants.SIGN_BIT;
}
function encodePositive(num) {
  return ~num;
}
function decodePositive(num) {
  return ~num;
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
  return num > ImmediateConstants.SIGN_BIT ? decodePositive(num) : decodeNegative(num);
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
function values(obj) {
  return Object.values(obj);
}
function entries(dict) {
  return Object.entries(dict);
}

function castToSimple(node) {
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
  if (typeof document === undefined) {
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

export { COMMENT_NODE, DOCUMENT_FRAGMENT_NODE, DOCUMENT_NODE, DOCUMENT_TYPE_NODE, ELEMENT_NODE, EMPTY_ARRAY, EMPTY_NUMBER_ARRAY, EMPTY_STRING_ARRAY, INSERT_AFTER_BEGIN, INSERT_AFTER_END, INSERT_BEFORE_BEGIN, INSERT_BEFORE_END, ImmediateConstants, LOCAL_LOGGER, LOGGER, NS_HTML, NS_MATHML, NS_SVG, NS_XLINK, NS_XML, NS_XMLNS, RAW_NODE, SERIALIZATION_FIRST_NODE_STRING, StackImpl as Stack, TEXT_NODE, arrayToOption, asPresentArray, debugAssert as assert, assertNever, assertPresent, assertPresentArray, assign, beginTestSteps, buildUntouchableThis, castToBrowser, castToSimple, checkBrowserNode as checkNode, clearElement, constants, debugToString$1 as debugToString, decodeHandle, decodeImmediate, decodeNegative, decodePositive, deprecate, dict, emptyArray, encodeHandle, encodeImmediate, encodeNegative, encodePositive, endTestSteps, entries, enumerate, exhausted, expect, extractHandle, fillNulls, getFirst, getLast, ifPresent, intern, isDict, isElement, isEmptyArray, isErrHandle, isHandle, isNonPrimitiveHandle, isObject, isOkHandle, isPresent, isPresentArray, isSerializationFirstNode, isSimpleElement, isSmallInt, keys, logStep, mapPresentArray, reverse, strip, tuple, unreachable, unwrap, unwrapHandle, unwrapTemplate, values, verifySteps };
