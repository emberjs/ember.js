import emberNames from './ember-object-names';

export default function getObjectName(object: any): string {
  let name = '';
  let className =
    (object.constructor && (emberNames.get(object.constructor) || object.constructor.name)) || '';

  if (object instanceof Function) {
    return 'Function ' + object.name;
  }

  // check if object is a primitive value
  if (object !== Object(object)) {
    return typeof object;
  }

  if (Array.isArray(object)) {
    return 'array';
  }

  if (object.constructor && object.constructor.prototype === object) {
    let { constructor } = object;

    if (
      constructor.toString &&
      constructor.toString !== Object.prototype.toString &&
      constructor.toString !== Function.prototype.toString
    ) {
      try {
        name = constructor.toString();
      } catch {
        name = constructor.name;
      }
    } else {
      name = constructor.name;
    }
  } else if (
    'toString' in object &&
    object.toString !== Object.prototype.toString &&
    object.toString !== Function.prototype.toString
  ) {
    try {
      name = object.toString();
    } catch {
      //
    }
  }

  // If the class has a decent looking name, and the `toString` is one of the
  // default Ember toStrings, replace the constructor portion of the toString
  // with the class name. We check the length of the class name to prevent doing
  // this when the value is minified.
  if (
    name.match(/<.*:.*>/) &&
    !className.startsWith('_') &&
    className.length > 2 &&
    className !== 'Class'
  ) {
    return name.replace(/<.*:/, `<${className}:`);
  }

  return name || className || '(unknown class)';
}
