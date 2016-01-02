import { parse } from 'glimmer-syntax';

function normalizeNode(obj) {
  if (obj && typeof obj === 'object') {
    let newObj;
    if (obj.splice) {
      newObj = new Array(obj.length);

      for (let i = 0; i < obj.length; i++) {
        newObj[i] = normalizeNode(obj[i]);
      }
    } else {
      newObj = {};

      for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
          newObj[key] = normalizeNode(obj[key]);
        }
      }

      if (newObj.type) {
        newObj._type = newObj.type;
        delete newObj.type;
      }

      delete newObj.loc;
    }
    return newObj;
  } else {
    return obj;
  }
}

export function astEqual(actual, expected, message?) {
  if (typeof actual === 'string') {
    actual = parse(actual);
  }
  if (typeof expected === 'string') {
    expected = parse(expected);
  }

  actual = normalizeNode(actual);
  expected = normalizeNode(expected);

  deepEqual(actual, expected, message);
}
