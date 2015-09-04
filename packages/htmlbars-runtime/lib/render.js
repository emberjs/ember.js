import { visitChildren } from "../htmlbars-util/morph-utils";
import statementVisitor, { alwaysDirtyVisitor, initialVisitor } from "./node-visitor";
import Morph from "./morph";
import { clearMorph } from "../htmlbars-util/template-utils";
import voidMap from '../htmlbars-util/void-tag-names';
import Template, { buildStatements } from './template';

var svgNamespace = "http://www.w3.org/2000/svg";

let EMPTY_RENDER_RESULT;

export function topLevelRender(template, env, scope, options) {
  if (template.isEmpty) { return EMPTY_RENDER_RESULT; }

  primeNamespace(env, options.contextualElement);

  var renderResult = RenderResult.buildTopLevel(env, scope, template, options, options.contextualElement);
  renderResult.render();

  return renderResult;
}

export default topLevelRender;

export function nestedRender(template, env, scope, options) {
  if (template.isEmpty) { return EMPTY_RENDER_RESULT; }

  primeNamespace(env, options.renderNode.contextualElement);

  var renderResult = RenderResult.buildNested(env, scope, template, options, options.renderNode.contextualElement);
  renderResult.render();
  options.renderNode.setContent(renderResult.fragment);

  return renderResult;
}

function primeNamespace(env, contextualElement) {
  var dom = env.dom;
  dom.detectNamespace(contextualElement);
}

export function RenderOptions({ renderNode, self, blockArguments, contextualElement, isEmpty }) {
  this.renderNode = renderNode || null;
  this.self = self; // self is a user value, so `undefined` represents missingness, not null
  this.blockArguments = blockArguments || null;
  this.contextualElement = contextualElement || null;
  this.isEmpty = isEmpty || false;
}

function RenderResult(env, scope, options, rootNode, nodes, fragment, template) {
  this.isEmpty = options.isEmpty || template.isEmpty;
  this.root = rootNode;
  this.fragment = fragment;

  this.nodes = nodes;
  this.template = template;
  this.env = env;
  this.scope = scope;

  if (this.isEmpty) { return; }

  if (options.self !== undefined) { this._bindSelf(options.self); }
  if (options.blockArguments !== undefined) { this._bindLocals(options.blockArguments); }
}

RenderResult.buildTopLevel = function(env, scope, template, options, contextualElement) {
  var dom = env.dom;
  var fragment = template.buildRoot(env);
  var nodes = template.buildRenderNodes(dom, fragment, contextualElement);

  let rootNode = dom.createMorph(null, fragment.firstChild, fragment.lastChild, contextualElement);
  rootNode.ownerNode = rootNode;

  nodes.forEach(node => node.ownerNode = rootNode);
  rootNode.childNodes = nodes;
  return new RenderResult(env, scope, new RenderOptions(options), rootNode, nodes, fragment, template);
};

RenderResult.buildNested = function(env, scope, template, options, contextualElement) {
  var dom = env.dom;
  var fragment = template.buildRoot(env);
  var nodes = template.buildRenderNodes(dom, fragment, contextualElement);

  let rootNode = options.renderNode;
  let ownerNode = rootNode.ownerNode;

  nodes.forEach(node => node.ownerNode = ownerNode);
  rootNode.childNodes = nodes;
  return new RenderResult(env, scope, new RenderOptions(options), rootNode, nodes, fragment, template);
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

RenderResult.prototype.render = function() {
  if (this.isEmpty) { return; }

  this.root.lastResult = this;
  this.root.rendered = true;
  this._populateNodes(initialVisitor);
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
  if (this.template.isEmpty) { return; }

  if (env !== undefined) { this.env = env; }
  if (scope !== undefined) { this.scope = scope; }

  if (self !== undefined) { this._updateSelf(self); }
  if (blockArguments !== undefined) { this._updateLocals(blockArguments); }

  this._populateNodes(visitor);
};

RenderResult.prototype.destroy = function() {
  if (this.isEmpty) { return; }
  var rootNode = this.root;
  clearMorph(rootNode, this.env, true);
};

RenderResult.prototype._populateNodes = function(visitor) {
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

RenderResult.prototype._bindSelf = function(self) {
  this.env.hooks.bindSelf(this.env, this.scope, self);
};

RenderResult.prototype._updateSelf = function(self) {
  this.env.hooks.updateSelf(this.env, this.scope, self);
};

RenderResult.prototype._bindLocals = function(blockArguments) {
  var localNames = this.template.locals;

  for (var i=0, l=localNames.length; i<l; i++) {
    this.env.hooks.bindLocal(this.env, this.scope, localNames[i], blockArguments[i]);
  }
};

RenderResult.prototype._updateLocals = function(blockArguments) {
  var localNames = this.template.locals;

  for (var i=0, l=localNames.length; i<l; i++) {
    this.env.hooks.updateLocal(this.env, this.scope, localNames[i], blockArguments[i]);
  }
};

EMPTY_RENDER_RESULT = new RenderResult(undefined, undefined, new RenderOptions({ isEmpty: true }));

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
