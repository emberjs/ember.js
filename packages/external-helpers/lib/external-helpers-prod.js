const create = Object.create;
const setPrototypeOf = Object.setPrototypeOf;
const defineProperty = Object.defineProperty;

export function classCallCheck() {}

export function inherits(subClass, superClass) {
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

export function possibleConstructorReturn(self, call) {
  return (call !== null && typeof call === 'object') || typeof call === 'function' ? call : self;
}
