import type { AnyFn } from '@glimmer/interfaces';

let debugToString: undefined | ((value: unknown) => string);

if (import.meta.env?.DEV) {
  let getFunctionName = (fn: AnyFn) => {
    let functionName = fn.name;

    if (functionName === '') {
      let match = /function (\w+)\s*\(/u.exec(String(fn));

      functionName = (match && match[1]) || '';
    }

    return functionName.replace(/^bound /u, '');
  };

  let getObjectName = (obj: object) => {
    let name;
    let className;

    if (typeof obj.constructor === 'function') {
      className = getFunctionName(obj.constructor);
    }

    if (
      'toString' in obj &&
      obj.toString !== Object.prototype.toString &&
      obj.toString !== Function.prototype.toString
    ) {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      name = obj.toString();
    }

    // If the class has a decent looking name, and the `toString` is one of the
    // default Ember toStrings, replace the constructor portion of the toString
    // with the class name. We check the length of the class name to prevent doing
    // this when the value is minified.
    if (
      name &&
      /<.*:ember\d+>/u.test(name) &&
      className &&
      className[0] !== '_' &&
      className.length > 2 &&
      className !== 'Class'
    ) {
      return name.replace(/<.*:/u, `<${className}:`);
    }

    return name || className;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let getPrimitiveName = (value: any) => {
    return String(value);
  };

  debugToString = (value: unknown) => {
    if (typeof value === 'function') {
      return getFunctionName(value) || `(unknown function)`;
    } else if (typeof value === 'object' && value !== null) {
      return getObjectName(value) || `(unknown object)`;
    } else {
      return getPrimitiveName(value);
    }
  };
}

export default debugToString;
