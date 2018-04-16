export function defaultTrue(v: any | undefined | null) {
  return v === false ? false : true;
}

export function defaultFalse(v: any | undefined | null) {
  return v === true ? true : false;
}

export function normalizeExtendPrototypes(obj: any | undefined | null) {
  if (obj === false) {
    return { String: false, Array: false, Function: false };
  }
  if (obj === undefined || obj === null || obj === true) {
    return { String: true, Array: true, Function: true };
  }
  return {
    String: defaultTrue(obj.String),
    Array: defaultTrue(obj.Array),
    Function: defaultTrue(obj.Function),
  };
}
