import getValue from "ember-htmlbars/hooks/get-value";

export default function invokeHelper(morph, env, scope, visitor, _params, _hash, helper, templates, context) {
  var params, hash;

  if (typeof helper === 'function') {
    params = getArrayValues(_params);
    hash = getHashValues(_hash);
    return { value: helper.call(context, params, hash, templates) };
  } else if (helper && helper.helperFunction) {
    var helperFunc = helper.helperFunction;
    return { value: helperFunc.call({}, _params, _hash, templates, env, scope) };
  }
}

// We don't want to leak mutable cells into helpers, which
// are pure functions that can only work with values.
function getArrayValues(params) {
  let out = [];
  for (let i=0, l=params.length; i<l; i++) {
    out.push(getValue(params[i]));
  }

  return out;
}

function getHashValues(hash) {
  let out = {};
  for (let prop in hash) {
    out[prop] = getValue(hash[prop]);
  }

  return out;
}
