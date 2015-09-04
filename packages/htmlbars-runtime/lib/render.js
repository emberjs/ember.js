import { visitChildren } from "../htmlbars-util/morph-utils";
import statementVisitor, { alwaysDirtyVisitor, initialVisitor } from "./node-visitor";
import Morph from "./morph";
import { clearMorph } from "../htmlbars-util/template-utils";
import voidMap from '../htmlbars-util/void-tag-names';
import Template, { buildStatements } from './template';

var svgNamespace = "http://www.w3.org/2000/svg";

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

export function RenderOptions(renderNode, self, blockArguments, contextualElement) {
  this.renderNode = renderNode || null;
  this.self = self;
  this.blockArguments = blockArguments || null;
  this.contextualElement = contextualElement || null;
}

function RenderResult(env, scope, options, rootNode, ownerNode, nodes, fragment, template, shouldSetContent) {
  this.root = rootNode;
  this.fragment = fragment;

  this.nodes = nodes;
  this.template = template;
  this.env = env;
  this.scope = scope;
  this.shouldSetContent = shouldSetContent;

  if (options.self !== undefined) { this.bindSelf(options.self); }
  if (options.blockArguments !== undefined) { this.bindLocals(options.blockArguments); }

  this.initializeNodes(ownerNode);
}

RenderResult.build = function(env, scope, template, options, contextualElement) {
  var dom = env.dom;
  var fragment = template.buildRoot(env);
  var nodes = template.buildRenderNodes(dom, fragment, contextualElement);

  var rootNode, ownerNode, shouldSetContent;

  if (options && options.renderNode) {
    rootNode = options.renderNode;
    ownerNode = rootNode.ownerNode;
    shouldSetContent = true;
  } else {
    rootNode = dom.createMorph(null, fragment.firstChild, fragment.lastChild, contextualElement);
    ownerNode = rootNode;
    rootNode.ownerNode = ownerNode;
    shouldSetContent = false;
  }

  if (rootNode.childNodes) {
    visitChildren(rootNode.childNodes, function(node) {
      clearMorph(node, env, true);
    });
  }

  rootNode.childNodes = nodes;
  return new RenderResult(env, scope, options, rootNode, ownerNode, nodes, fragment, template, shouldSetContent);
};

export function manualElement(tagName, attributes, _isEmpty) {
  var statements = [];

  for (var key in attributes) {
    if (typeof attributes[key] === 'string') { continue; }
    statements.push(["attribute", key, attributes[key]]);
  }

  var isEmpty = _isEmpty || voidMap[tagName];

  if (!isEmpty) {
    statements.push(['content', 'yield']);
  }

  return new Template({
    statements: buildStatements(statements),

    buildRoot(env) {
      let dom = env.dom;

      if (tagName === 'svg') {
        dom.setNamespace(svgNamespace);
      }

      var el0 = dom.createElement(tagName);

      for (var key in attributes) {
        if (typeof attributes[key] !== 'string') { continue; }
        dom.setAttribute(el0, key, attributes[key]);
      }

      if (!isEmpty) {
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
      }

      return el0;
    },

    buildRenderNodes(dom, element) {
      var morphs = [];

      for (var key in attributes) {
        if (typeof attributes[key] === 'string') { continue; }
        morphs.push(dom.createAttrMorph(element, key));
      }

      if (!isEmpty) {
        morphs.push(dom.createMorphAt(element, 0, 0));
      }

      return morphs;
    }
  });
}

RenderResult.prototype.initializeNodes = function(ownerNode) {
  let childNodes = this.root.childNodes;

  for (let i=0, l=childNodes.length; i<l; i++) {
    childNodes[i].ownerNode = ownerNode;
  }
};

RenderResult.prototype.render = function() {
  this.root.lastResult = this;
  this.root.rendered = true;
  this.populateNodes(initialVisitor);

  if (this.shouldSetContent && this.root.setContent) {
    this.root.setContent(this.fragment);
  }
};

RenderResult.prototype.dirty = function() {
  visitChildren([this.root], function(node) { node.isDirty = true; });
};

RenderResult.prototype.revalidate = function(env, self, blockArguments, scope) {
  this.revalidateWith(env, scope, self, blockArguments, statementVisitor);
};

RenderResult.prototype.rerender = function(env, self, blockArguments, scope) {
  this.revalidateWith(env, scope, self, blockArguments, alwaysDirtyVisitor);
};

RenderResult.prototype.revalidateWith = function(env, scope, self, blockArguments, visitor) {
  if (env !== undefined) { this.env = env; }
  if (scope !== undefined) { this.scope = scope; }
  this.updateScope();

  if (self !== undefined) { this.updateSelf(self); }
  if (blockArguments !== undefined) { this.updateLocals(blockArguments); }

  this.populateNodes(visitor);
};

RenderResult.prototype.destroy = function() {
  var rootNode = this.root;
  clearMorph(rootNode, this.env, true);
};

RenderResult.prototype.populateNodes = function(visitor) {
  var env = this.env;
  var scope = this.scope;
  var nodes = this.nodes;
  var statements = this.template._statements;
  var i, l;

  for (i=0, l=statements.length; i<l; i++) {
    var statement = statements[i];
    var morph = nodes[i];

    if (env.hooks.willRenderNode) {
      env.hooks.willRenderNode(morph, env, scope);
    }

    visitor(statement, morph, env, scope, visitor);

    if (env.hooks.didRenderNode) {
      env.hooks.didRenderNode(morph, env, scope);
    }
  }
};

RenderResult.prototype.bindScope = function() {
  this.env.hooks.bindScope(this.env, this.scope);
};

RenderResult.prototype.updateScope = function() {
  this.env.hooks.updateScope(this.env, this.scope);
};

RenderResult.prototype.bindSelf = function(self) {
  this.env.hooks.bindSelf(this.env, this.scope, self);
};

RenderResult.prototype.updateSelf = function(self) {
  this.env.hooks.updateSelf(this.env, this.scope, self);
};

RenderResult.prototype.bindLocals = function(blockArguments) {
  var localNames = this.template.locals;

  for (var i=0, l=localNames.length; i<l; i++) {
    this.env.hooks.bindLocal(this.env, this.scope, localNames[i], blockArguments[i]);
  }
};

RenderResult.prototype.updateLocals = function(blockArguments) {
  var localNames = this.template.locals;

  for (var i=0, l=localNames.length; i<l; i++) {
    this.env.hooks.updateLocal(this.env, this.scope, localNames[i], blockArguments[i]);
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
