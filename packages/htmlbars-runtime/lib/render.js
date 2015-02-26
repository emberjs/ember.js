import { forEach } from "../htmlbars-util/array-utils";
import { visitChildren } from "../htmlbars-util/morph-utils";
import ExpressionVisitor from "./expression-visitor";
import { AlwaysDirtyVisitor } from "./expression-visitor";
import Morph from "./morph";

export default function render(template, env, scope, options) {
  var dom = env.dom;
  var contextualElement, self, blockArguments;

  if (options) {
    if (options.renderNode) {
      contextualElement = options.renderNode.contextualElement;
    } else if (options.contextualElement) {
      contextualElement = options.contextualElement;
    }

    self = options.self;
    blockArguments = options.blockArguments;
  }

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

  if (rootNode.childNodes && env.hooks.cleanup) {
    visitChildren(rootNode.childNodes, function(node) {
      env.hooks.cleanup(node);
    });
  }

  rootNode.childNodes = nodes;

  forEach(nodes, function(node) {
    initializeNode(node, ownerNode);
  });

  var statements = template.statements;
  var locals = template.locals;

  populateNodes(env, scope, self, blockArguments, AlwaysDirtyVisitor);

  if (options && options.renderNode) {
    rootNode.setContent(fragment);
  }

  var lastResult = {
    root: rootNode,
    fragment: fragment,
    dirty: function() {
      visitChildren([rootNode], function(node) { node.isDirty = true; });
    },
    destroy: function() {
      if (env.hooks.cleanup) {
        visitChildren([rootNode], function(node) {
          env.hooks.cleanup(node);
        });
      }
      rootNode.clear();
    },
    revalidate: function(env, self, blockArguments, scope) {
      lastResult.revalidateWith(env, scope, self, blockArguments, ExpressionVisitor);
    },
    rerender: function(env, self, blockArguments, scope) {
      lastResult.revalidateWith(env, scope, self, blockArguments, AlwaysDirtyVisitor);
    },
    revalidateWith: function(newEnv, newScope, newSelf, newBlockArguments, visitor) {
      if (newSelf !== undefined) { self = newSelf; }
      if (newEnv !== undefined) { env = newEnv; }
      if (newScope !== undefined) { scope = newScope; }
      if (newBlockArguments !== undefined) { blockArguments = newBlockArguments; }

      populateNodes(env, scope, self, blockArguments, visitor);
    },
  };

  rootNode.lastResult = lastResult;

  return lastResult;

  function populateNodes(env, scope, self, blockArguments, visitor) {
    var i, l;

    if (self !== undefined) {
      env.hooks.bindSelf(scope, self);
    }

    for (i=0, l=locals.length; i<l; i++) {
      env.hooks.bindLocal(env, scope, locals[i], blockArguments[i]);
    }

    for (i=0, l=statements.length; i<l; i++) {
      visitor.accept(statements[i], nodes[i], env, scope, template, visitor);
    }
  }
}

function initializeNode(node, owner) {
  node.ownerNode = owner;
}

export function createChildMorph(dom, parentMorph, contextualElement) {
  var morph = Morph.empty(dom, contextualElement || parentMorph.contextualElement);
  initializeNode(morph, parentMorph.ownerNode);
  return morph;
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

