import { forEach } from "../htmlbars-util/array-utils";

export default function render(template, context, env, options, blockArguments) {
  var dom = env.dom;
  var contextualElement = options && options.contextualElement;

  dom.detectNamespace(contextualElement);

  var fragment = getCachedFragment(template, env);
  var nodes = template.buildRenderNodes(dom, fragment, contextualElement);

  var rootNode, ownerNode;

  if (options && options.renderNode) {
    rootNode = options.renderNode;
    ownerNode = rootNode.ownerNode;
  } else {
    rootNode = dom.createMorph(null, fragment.firstChild, fragment.lastChild, contextualElement);
    ownerNode = rootNode;
    rootNode.ownerNode = rootNode;
  }

  rootNode.childNodes = nodes;

  forEach(nodes, function(node) {
    node.ownerNode = ownerNode;
  });

  template.render(context, rootNode, env, options, blockArguments);

  if (options && options.renderNode) {
    rootNode.setContent(fragment);
  }

  return {
    root: rootNode,
    fragment: fragment,
    revalidate: function(newContext, newEnv, newOptions) {
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

