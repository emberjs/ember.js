export function partial(params, hash, options, env) {
  var template = env.partials[params[0]];
  return template.render(this, env, options.morph.contextualElement);
}

export default {
  partial: partial
};
