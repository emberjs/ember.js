import { visitChildren } from '../htmlbars-util/morph-utils';
import statementVisitor, { alwaysDirtyVisitor, initialVisitor } from './node-visitor';
import Morph from './morph';
import { clearMorph } from '../htmlbars-util/template-utils';
import { debugStruct as struct } from '../htmlbars-util/object-utils';
import * as types from '../htmlbars-util/object-utils';
import voidMap from '../htmlbars-util/void-tag-names';
import Template, { buildStatements } from './template';

let svgNamespace = 'http://www.w3.org/2000/svg';

let EMPTY_RENDER_RESULT;

export function topLevelRender(template, env, scope, options) {
  if (template.isEmpty) { return EMPTY_RENDER_RESULT; }

  primeNamespace(env, options.contextualElement);

  let dom = env.dom;
  let element = dom.createDocumentFragment();
  let rootNode = dom.morphForChildren(element, options.contextualElement);
  rootNode.ownerNode = rootNode;

  let result = RenderResult.build(env, scope, template, options, rootNode);
  result.fragment = element;
  return result;
}

export default topLevelRender;

export function nestedRender(template, env, scope, options) {
  if (template.isEmpty) { return EMPTY_RENDER_RESULT; }

  primeNamespace(env, options.renderNode.contextualElement);

  let renderResult = RenderResult.build(env, scope, template, options, options.renderNode);

  return renderResult;
}

function primeNamespace(env, contextualElement) {
  let dom = env.dom;
  dom.detectNamespace(contextualElement);
}

export const RenderOptions = struct({
  renderNode: types.OBJECT,
  self: types.ANY,
  blockArguments: types.OBJECT,
  contextualElement: types.OBJECT,
  isEmpty: types.BOOLEAN
});

function RenderResult(env, scope, options, rootNode, evalResult,  template) {
  this.isEmpty = options.isEmpty || template.isEmpty || evalResult.statements.length === 0;
  this.root = rootNode;
  this.fragment = null;

  this.evalResult = evalResult;
  this.template = template;
  this.env = env;
  this.scope = scope;

  if (this.isEmpty) { return; }
}

RenderResult.build = function(env, scope, template, options, rootNode) {

  if (options.self !== undefined) { bindSelf(env, scope, options.self); }
  if (options.blockArguments !== undefined) { bindLocals(env, scope, template.locals, options.blockArguments); }

  let evalResult = template.evaluate(rootNode, { env, scope, visitor: initialVisitor });
  let { morphs } = evalResult;

  let result = new RenderResult(env, scope, new RenderOptions(options), rootNode, evalResult,  template);
  rootNode.lastResult = result;
  rootNode.rendered = true;
  rootNode.childNodes = morphs;

  return result;
};

export function manualElement(tagName, attributes, _isEmpty) {
  let statements = [];

  for (let key in attributes) {
    if (typeof attributes[key] === 'string') { continue; }
    statements.push(['attribute', key, attributes[key]]);
  }

  let isEmpty = _isEmpty || voidMap[tagName];

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

      let el0 = dom.createElement(tagName);

      for (let key in attributes) {
        if (typeof attributes[key] !== 'string') { continue; }
        dom.setAttribute(el0, key, attributes[key]);
      }

      if (!isEmpty) {
        let el1 = dom.createComment('');
        dom.appendChild(el0, el1);
      }

      return el0;
    },

    buildRenderNodes(dom, element) {
      let morphs = [];

      for (let key in attributes) {
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

  if (self !== undefined) { updateSelf(this.env, this.scope, self); }
  if (blockArguments !== undefined) { updateLocals(this.env, this.scope, this.template.locals, blockArguments); }

  let { statements, morphs } = this.evalResult;
  statements.forEach((statement, i) => {
    statement.evaluate(morphs[i], this.env, this.scope, visitor);
  });
};

RenderResult.prototype.destroy = function() {
  if (this.isEmpty) { return; }
  let rootNode = this.root;
  clearMorph(rootNode, this.env, true);
};

RenderResult.prototype._populateNodes = function(visitor) {
  let env = this.env;
  let scope = this.scope;
  let nodes = this.nodes;
  let statements = this.template._statements;
  let i, l;

  for (i=0, l=statements.length; i<l; i++) {
    let statement = statements[i];
    let morph = nodes[i];

    if (env.hooks.willRenderNode) {
      env.hooks.willRenderNode(morph, env, scope);
    }

    visitor(statement, morph, env, scope, visitor);

    if (env.hooks.didRenderNode) {
      env.hooks.didRenderNode(morph, env, scope);
    }
  }
};

function bindSelf(env, scope, self) {
  env.hooks.bindSelf(env, scope, self);
}

function updateSelf(env, scope, self) {
  env.hooks.updateSelf(env, scope, self);
}

function bindLocals(env, scope, localNames, blockArguments) {
  for (let i=0, l=localNames.length; i<l; i++) {
    env.hooks.bindLocal(env, scope, localNames[i], blockArguments[i]);
  }
}

function updateLocals(env, scope, localNames, blockArguments) {
  for (let i=0, l=localNames.length; i<l; i++) {
    env.hooks.updateLocal(env, scope, localNames[i], blockArguments[i]);
  }
}

EMPTY_RENDER_RESULT = new RenderResult(undefined, undefined, new RenderOptions({ isEmpty: true }));

function initializeNode(node, owner) {
  node.ownerNode = owner;
}

export function createChildMorph(dom, parentMorph, contextualElement) {
  let morph = Morph.empty(dom, contextualElement || parentMorph.contextualElement);
  initializeNode(morph, parentMorph.ownerNode);
  return morph;
}

export function getCachedFragment(template, env) {
  let dom = env.dom, fragment;
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
