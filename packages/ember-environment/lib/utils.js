export function defaultTrue(v) {
  return v === false ? false : true;
}

export function defaultFalse(v) {
  return v === true ? true : false;
}

export function normalizeExtendPrototypes(obj) {
  if (obj === false) {
    return { String: false, Array: false, Function: false };
  } else if (!obj || obj === true) {
    return { String: true, Array: true, Function: true };
  } else {
    return {
      String: defaultTrue(obj.String),
      Array: defaultTrue(obj.Array),
      Function: defaultTrue(obj.Function),
    };
  }
}
