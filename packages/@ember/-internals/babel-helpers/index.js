import { DEBUG } from '@glimmer/env';

const create = Object.create;
const setPrototypeOf = Object.setPrototypeOf;
const defineProperty = Object.defineProperty;

export function classCallCheck(instance, Constructor) {
  if (DEBUG && !(instance instanceof Constructor)) {
    throw new TypeError('Cannot call a class as a function');
  }
}

export function inherits(subClass, superClass) {
  if (DEBUG && typeof superClass !== 'function' && superClass !== null) {
    throw new TypeError(
      'Super expression must either be null or a function, not ' + typeof superClass
    );
  }
  subClass.prototype = create(superClass === null ? null : superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true,
    },
  });
  if (superClass !== null) setPrototypeOf(subClass, superClass);
}

export function taggedTemplateLiteralLoose(strings, raw) {
  strings.raw = raw;
  return strings;
}

function defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ('value' in descriptor) descriptor.writable = true;
    defineProperty(target, descriptor.key, descriptor);
  }
}

export function createClass(Constructor, protoProps, staticProps) {
  if (protoProps !== undefined) defineProperties(Constructor.prototype, protoProps);
  if (staticProps !== undefined) defineProperties(Constructor, staticProps);
  return Constructor;
}

export const possibleConstructorReturn = function(self, call) {
  if (DEBUG && !self) {
    throw new ReferenceError(`this hasn't been initialized - super() hasn't been called`);
  }
  return (call !== null && typeof call === 'object') || typeof call === 'function' ? call : self;
};
