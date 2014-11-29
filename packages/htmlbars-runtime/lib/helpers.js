import { get } from "./utils";

export function concat(params, hash, options) {
  var value = "";
  for (var i = 0, l = params.length; i < l; i++) {
    if (options.paramTypes[i] === 'id') {
      value += get(this, params[i], options);
    } else {
      value += params[i];
    }
  }
  return value;
}

export function partial(params, hash, options, env) {
  return env.partials[params[0]](this, env, options.morph.contextualElement);
}

export default {
  concat: concat,
  partial: partial
};
