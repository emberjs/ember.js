export function concat(params) {
  var value = "";
  for (var i = 0, l = params.length; i < l; i++) {
    value += params[i];
  }
  return value;
}

export function partial(params, hash, options, env) {
  var template = env.partials[params[0]];
  return template.render(this, env, options.morph.contextualElement);
}

export default {
  concat: concat,
  partial: partial
};
