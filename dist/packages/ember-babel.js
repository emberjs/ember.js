/* globals Reflect */

import { DEBUG } from '@glimmer/env';

const setPrototypeOf = Object.setPrototypeOf;
const getPrototypeOf = Object.getPrototypeOf;

const hasReflectConstruct = typeof Reflect === 'object' && typeof Reflect.construct === 'function';

const nativeWrapperCache = new Map();

// Implementations:
// https://github.com/babel/babel/blob/436d78920883603668666210a4aacf524257bc3b/packages/babel-helpers/src/helpers.ts#L958
let privateFieldId = 0;
export function classPrivateFieldLooseKey(name) {
  return '__private_' + privateFieldId++ + '_' + name;
}
export function classPrivateFieldLooseBase(receiver, privateKey) {
  if (!Object.prototype.hasOwnProperty.call(receiver, privateKey)) {
    throw new TypeError('attempted to use private field on non-instance');
  }
  return receiver;
}

// Super minimal version of Babel's wrapNativeSuper. We only use this for
// extending Function, for ComputedDecoratorImpl and AliasDecoratorImpl. We know
// we will never directly create an instance of these classes so no need to
// include `construct` code or other helpers.
export function wrapNativeSuper(Class) {
  if (nativeWrapperCache.has(Class)) {
    return nativeWrapperCache.get(Class);
  }

  function Wrapper() {}
  Wrapper.prototype = Object.create(Class.prototype, {
    constructor: {
      value: Wrapper,
      enumerable: false,
      writable: true,
      configurable: true,
    },
  });

  nativeWrapperCache.set(Class, Wrapper);

  return setPrototypeOf(Wrapper, Class);
}

export function classCallCheck(instance, Constructor) {
  if (DEBUG) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError('Cannot call a class as a function');
    }
  }
}

/*
  Overrides default `inheritsLoose` to _also_ call `Object.setPrototypeOf`.
  This is needed so that we can use `loose` option with the
  `@babel/plugin-transform-classes` (because we want simple assignment to the
  prototype wherever possible) but also keep our constructor based prototypal
  inheritance working properly
*/
export function inheritsLoose(subClass, superClass) {
  if (DEBUG) {
    if (typeof superClass !== 'function' && superClass !== null) {
      throw new TypeError('Super expression must either be null or a function');
    }
  }
  subClass.prototype = Object.create(superClass === null ? null : superClass.prototype, {
    constructor: {
      value: subClass,
      writable: true,
      configurable: true,
    },
  });
  if (superClass !== null) {
    setPrototypeOf(subClass, superClass);
  }
}

export function taggedTemplateLiteralLoose(strings, raw) {
  if (!raw) {
    raw = strings.slice(0);
  }
  strings.raw = raw;
  return strings;
}

function _defineProperties(target, props) {
  for (let i = 0; i < props.length; i++) {
    let descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ('value' in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

/*
  Differs from default implementation by avoiding boolean coercion of
  `protoProps` and `staticProps`.
*/
export function createClass(Constructor, protoProps, staticProps) {
  if (protoProps !== null && protoProps !== undefined) {
    _defineProperties(Constructor.prototype, protoProps);
  }

  if (staticProps !== null && staticProps !== undefined) {
    _defineProperties(Constructor, staticProps);
  }

  return Constructor;
}

export function assertThisInitialized(self) {
  if (DEBUG && self === void 0) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }
  return self;
}

/*
  Adds `DEBUG` guard to error being thrown, and avoids boolean coercion of `call`.
*/
export function possibleConstructorReturn(self, call) {
  if ((typeof call === 'object' && call !== null) || typeof call === 'function') {
    return call;
  }
  return assertThisInitialized(self);
}

export function objectDestructuringEmpty(obj) {
  if (DEBUG && (obj === null || obj === undefined)) {
    throw new TypeError('Cannot destructure undefined');
  }
}

/*
  Differs from default implementation by checking for _any_ `Reflect.construct`
  (the default implementation tries to ensure that `Reflect.construct` is truly
  the native one).

  Original source: https://github.com/babel/babel/blob/v7.9.2/packages/babel-helpers/src/helpers.js#L738-L757
*/
export function createSuper(Derived) {
  return function () {
    let Super = getPrototypeOf(Derived);
    let result;

    if (hasReflectConstruct) {
      // NOTE: This doesn't work if this.__proto__.constructor has been modified.
      let NewTarget = getPrototypeOf(this).constructor;
      result = Reflect.construct(Super, arguments, NewTarget);
    } else {
      result = Super.apply(this, arguments);
    }

    return possibleConstructorReturn(this, result);
  };
}

/*
  Does not differ from default implementation.
*/
function arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;

  let arr2 = new Array(len);
  for (let i = 0; i < len; i++) {
    arr2[i] = arr[i];
  }

  return arr2;
}

/*
  Does not differ from default implementation.
*/
function unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === 'string') return arrayLikeToArray(o, minLen);
  let n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === 'Object' && o.constructor) n = o.constructor.name;
  if (n === 'Map' || n === 'Set') return Array.from(n);
  if (n === 'Arguments' || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))
    return arrayLikeToArray(o, minLen);
}

/*
  Does not differ from default implementation.
*/
export function createForOfIteratorHelperLoose(o) {
  let i = 0;
  if (typeof Symbol === 'undefined' || o[Symbol.iterator] == null) {
    // Fallback for engines without symbol support
    if (Array.isArray(o) || (o = unsupportedIterableToArray(o)))
      return function () {
        if (i >= o.length) return { done: true };
        return { done: false, value: o[i++] };
      };
    throw new TypeError(
      'Invalid attempt to iterate non-iterable instance.\\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.'
    );
  }
  i = o[Symbol.iterator]();
  return i.next.bind(i);
}
