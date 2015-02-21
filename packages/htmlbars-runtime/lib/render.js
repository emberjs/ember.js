import { forEach } from "../htmlbars-util/array-utils";
import { visitChildren } from "../htmlbars-util/morph-utils";
import ExpressionVisitor from "./expression-visitor";
import { AlwaysDirtyVisitor } from "./expression-visitor";
import Morph from "./morph";

export default function render(template, env, scope, options) {
  var dom = env.dom;
  var contextualElement;

  if (options) {
    if (options.renderNode) {
      contextualElement = options.renderNode.contextualElement;
    } else if (options.contextualElement) {
      contextualElement = options.contextualElement;
    }
  }

  dom.detectNamespace(contextualElement);

  var renderResult = RenderResult.build(env, scope, template, options, contextualElement);
  renderResult.render();

  return renderResult;
}

function RenderResult(env, scope, options, rootNode, nodes, fragment, template, shouldSetContent) {
  this.root = rootNode;
  this.fragment = fragment;

  this.nodes = nodes;
  this.template = template;
  this.env = env;
  this.scope = scope;
  this.shouldSetContent = shouldSetContent;

  if (options.self !== undefined) { this.bindSelf(options.self); }
  if (options.blockArguments !== undefined) { this.bindLocals(options.blockArguments); }
}

RenderResult.build = function(env, scope, template, options, contextualElement) {
  var dom = env.dom;
  var fragment = getCachedFragment(template, env);
  var nodes = template.buildRenderNodes(dom, fragment, contextualElement);

  var rootNode, ownerNode, shouldSetContent;

  if (options && options.renderNode) {
    rootNode = options.renderNode;
    ownerNode = rootNode.ownerNode;
    shouldSetContent = true;
  } else {
    rootNode = dom.createMorph(null, fragment.firstChild, fragment.lastChild, contextualElement);
    ownerNode = rootNode;
    initializeNode(rootNode, ownerNode);
    shouldSetContent = false;
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

  return new RenderResult(env, scope, options, rootNode, nodes, fragment, template, shouldSetContent);
};

RenderResult.prototype.render = function() {
  this.root.lastResult = this;
  this.populateNodes(AlwaysDirtyVisitor);

  if (this.shouldSetContent) {
    this.root.setContent(this.fragment);
  }
};

RenderResult.prototype.dirty = function() {
  visitChildren([this.root], function(node) { node.isDirty = true; });
};

RenderResult.prototype.revalidate = function(env, self, blockArguments, scope) {
  this.revalidateWith(env, scope, self, blockArguments, ExpressionVisitor);
};

RenderResult.prototype.rerender = function(env, self, blockArguments, scope) {
  this.revalidateWith(env, scope, self, blockArguments, AlwaysDirtyVisitor);
};

RenderResult.prototype.revalidateWith = function(env, scope, self, blockArguments, visitor) {
  if (env !== undefined) { this.env = env; }
  if (scope !== undefined) { this.scope = scope; }

  if (self !== undefined) { this.bindSelf(self); }
  if (blockArguments !== undefined) { this.bindLocals(blockArguments); }

  this.populateNodes(visitor);
};

RenderResult.prototype.destroy = function() {
  var rootNode = this.root;
  var cleanup = this.env.hooks.cleanup;

  if (cleanup) {
    visitChildren([rootNode], function(node) {
      cleanup(node);
    });
  }
  rootNode.clear();
};

RenderResult.prototype.populateNodes = function(visitor) {
  var env = this.env;
  var scope = this.scope;
  var template = this.template;
  var nodes = this.nodes;
  var statements = template.statements;
  var i, l;

  for (i=0, l=statements.length; i<l; i++) {
    visitor.accept(statements[i], nodes[i], env, scope, template, visitor);
  }
};

RenderResult.prototype.bindSelf = function(self) {
  this.env.hooks.bindSelf(this.scope, self);
};

RenderResult.prototype.bindLocals = function(blockArguments) {
  var localNames = this.template.locals;

  for (var i=0, l=localNames.length; i<l; i++) {
    this.env.hooks.bindLocal(this.env, this.scope, localNames[i], blockArguments[i]);
  }
};

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

