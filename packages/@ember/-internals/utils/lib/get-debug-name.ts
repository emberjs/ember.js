import { DEBUG } from '@glimmer/env';

let getDebugName: undefined | ((value: any) => string);

if (DEBUG) {
  let getFunctionName = (fn: Function) => {
    let functionName = fn.name;

    if (functionName === undefined) {
      let match = Function.prototype.toString.call(fn).match(/function (\w+)\s*\(/);

      functionName = (match && match[1]) || '';
    }

    return functionName.replace(/^bound /, '');
  };

  let getObjectName = (obj: object) => {
    let name;
    let className;

    if (obj.constructor && obj.constructor !== Object) {
      className = getFunctionName(obj.constructor);
    }

    if (
      'toString' in obj &&
      obj.toString !== Object.prototype.toString &&
      obj.toString !== Function.prototype.toString
    ) {
      name = obj.toString();
    }

    // If the class has a decent looking name, and the `toString` is one of the
    // default Ember toStrings, replace the constructor portion of the toString
    // with the class name. We check the length of the class name to prevent doing
    // this when the value is minified.
    if (
      name &&
      name.match(/<.*:ember\d+>/) &&
      className &&
      className[0] !== '_' &&
      className.length > 2 &&
      className !== 'Class'
    ) {
      return name.replace(/<.*:/, `<${className}:`);
    }

    return name || className;
  };

  let getPrimitiveName = (value: any) => {
    return String(value);
  };

  getDebugName = (value: any) => {
    if (typeof value === 'function') {
      return getFunctionName(value) || `(unknown function)`;
    } else if (typeof value === 'object' && value !== null) {
      return getObjectName(value) || `(unknown object)`;
    } else {
      return getPrimitiveName(value);
    }
  };
}

export default getDebugName;
