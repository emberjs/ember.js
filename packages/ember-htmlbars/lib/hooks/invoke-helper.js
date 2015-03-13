import { readHash, readArray } from "ember-metal/streams/utils";

export default function invokeHelper(morph, env, scope, visitor, _params, _hash, helper, templates, context) {
  var params, hash;

  if (typeof helper === 'function') {
    params = readArray(_params);
    hash = readHash(_hash);
    return { value: helper.call(context, params, hash, templates) };
  } else if (helper.isLegacyViewHelper) {
    env.hooks.keyword('view', morph, env, scope, [helper.viewClass], _hash, null, null, visitor);
  } else if (helper.helperFunction) {
    var helperFunc = helper.helperFunction;
    return { value: helperFunc.call({}, _params, _hash, templates, env) };
  }
}
