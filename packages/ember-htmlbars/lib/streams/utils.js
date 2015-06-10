import getValue from "ember-htmlbars/hooks/get-value";

// We don't want to leak mutable cells into helpers, which
// are pure functions that can only work with values.
export function getArrayValues(params) {
  let out = [];
  for (let i=0, l=params.length; i<l; i++) {
    out.push(getValue(params[i]));
  }

  return out;
}

export function getHashValues(hash) {
  let out = {};
  for (let prop in hash) {
    out[prop] = getValue(hash[prop]);
  }

  return out;
}
