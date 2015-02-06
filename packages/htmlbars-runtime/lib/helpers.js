export function partial(params, hash, options, env) {
  var template = env.partials[params[0]];
  return template.render(this, env, options.renderNode.contextualElement).fragment;
}

export default {
  partial: partial
};
