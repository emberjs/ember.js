import { DEBUG } from '@glimmer/env';

const setPrototypeOf = Object.setPrototypeOf;

/*
  Adds `DEBUG` guard to error being thrown
*/
export function classCallCheck(instance, Constructor) {
  if (DEBUG && !(instance instanceof Constructor)) {
    throw new TypeError('Cannot call a class as a function');
  }
}

/*
  Overrides default `inheritsLoose` to _also_ call `Object.setPrototypeOf`.
  This is needed so that we can use `loose` option with the
  `@babel/plugin-transform-classes` (because we want simple assignment to the
  prototype whereever possible) but also keep our constructor based prototypal
  inheritance working properly
*/
export function inheritsLoose(subClass, superClass) {
  if (DEBUG && typeof superClass !== 'function' && superClass !== null) {
    throw new TypeError('Super expression must either be null or a function');
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
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
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
