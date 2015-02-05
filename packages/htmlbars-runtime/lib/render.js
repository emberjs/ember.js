export default function render(template, context, env, options, blockArguments) {
  var dom = env.dom;
  var contextualElement = options && options.contextualElement;

  dom.detectNamespace(contextualElement);

  var fragment = getCachedFragment(template, env);
  var nodes = template.buildRenderNodes(dom, fragment, contextualElement);

  var rootNode = dom.createMorph(null, fragment.firstChild, fragment.lastChild, contextualElement);
  rootNode.childNodes = nodes;

  template.render(context, rootNode, env, options, blockArguments);

  return {
    root: rootNode,
    fragment: fragment,
    rerender: function(newContext, newEnv, newOptions) {
      template.render(newContext, rootNode, newEnv || env, newOptions || options);
    }
  };
}

export function getCachedFragment(template, env) {
  var dom = env.dom, fragment;
  if (env.useFragmentCache && dom.canClone) {
    if (template.cachedFragment === null) {
      fragment = template.build(dom);
      if (template.hasRendered) {
        template.cachedFragment = fragment;
      } else {
        template.hasRendered = true;
      }
    }
    if (template.cachedFragment) {
      fragment = dom.cloneNode(template.cachedFragment, true);
    }
  } else if (!fragment) {
    fragment = template.build(dom);
  }

  return fragment;
}

