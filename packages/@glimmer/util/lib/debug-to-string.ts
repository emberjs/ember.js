import { DEBUG } from '@glimmer/env';

let debugToString: undefined | ((value: unknown) => string);

if (DEBUG) {
  debugToString = (value: unknown) => {
    let string;

    if (typeof value === 'function') {
      string = value.name;
    } else if (typeof value === 'object' && value !== null) {
      let className = (value.constructor && value.constructor.name) || '(unknown class)';

      string = `(an instance of ${className})`;
    } else if (value === undefined) {
      string = '(an unknown tag)';
    } else {
      string = String(value);
    }

    return string;
  };
}

export default debugToString;
