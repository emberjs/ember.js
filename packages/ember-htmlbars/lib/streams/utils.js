import getValue from 'ember-htmlbars/hooks/get-value';

// We don't want to leak mutable cells into helpers, which
// are pure functions that can only work with values.
export function getArrayValues(params) {
  let l = params.length;
  let out = new Array(l);
  for (let i=0; i<l; i++) {
    out[i] = getValue(params[i]);
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
