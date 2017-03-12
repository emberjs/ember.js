export function inherits(subClass, superClass) {
  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });

  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : defaults(subClass, superClass);
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
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

export function createClass(Constructor, protoProps, staticProps) {
  if (protoProps) defineProperties(Constructor.prototype, protoProps);
  if (staticProps) defineProperties(Constructor, staticProps);
  return Constructor;
}

export function interopExportWildcard(obj, defaults) {
  var newObj = defaults({}, obj);
  delete newObj['default'];
  return newObj;
}

export function defaults(obj, defaults) {
  var keys = Object.getOwnPropertyNames(defaults);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var value = Object.getOwnPropertyDescriptor(defaults, key);
    if (value && value.configurable && obj[key] === undefined) {
      Object.defineProperty(obj, key, value);
    }
  }
  return obj;
}

export const slice = Array.prototype.slice;

export function possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }
  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}
