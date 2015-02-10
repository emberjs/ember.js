import { forEach } from "../htmlbars-util/array-utils";
import ExpressionVisitor from "./expression-visitor";

export default function render(template, scope, env, options, blockArguments) {
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
    initializeNode(rootNode, ownerNode);
  }

  // TODO Invoke disposal hook recursively on old rootNode.childNodes

  rootNode.childNodes = nodes;

  forEach(nodes, function(node) {
    initializeNode(node, ownerNode);
  });

  var statements = template.statements;
  var locals = template.locals;

  populateNodes(scope, blockArguments);

  if (options && options.renderNode) {
    rootNode.setContent(fragment);
  }

  return {
    root: rootNode,
    fragment: fragment,
    dirty: function() {
      var nodes = [rootNode];

      while (nodes.length) {
        var node = nodes.pop();
        node.isDirty = true;
        nodes.push.apply(nodes, node.childNodes);
      }
    },
    revalidate: function(newScope, newBlockArguments) {
      if (newScope !== undefined) { scope.self = newScope; }
      populateNodes(scope, newBlockArguments || blockArguments);
    }
  };

  function populateNodes(scope, blockArguments) {
    var i, l;

    for (i=0, l=locals.length; i<l; i++) {
      env.hooks.bindLocal(env, scope, locals[i], blockArguments[i]);
    }

    for (i=0, l=statements.length; i<l; i++) {
      ExpressionVisitor.accept(statements[i], nodes[i], scope, env, template);
    }
  }
}

function initializeNode(node, owner) {
  node.ownerNode = owner;
  node.state = {};
  node.isDirty = true;
}

export function getCachedFragment(template, env) {
  var dom = env.dom, fragment;
  if (env.useFragmentCache && dom.canClone) {
    if (template.cachedFragment === null) {
      fragment = template.buildFragment(dom);
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
    fragment = template.buildFragment(dom);
  }

  return fragment;
}

