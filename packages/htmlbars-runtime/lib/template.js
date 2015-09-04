import { InternalParams } from '../htmlbars-util/morph-utils';

// REFACTOR TODO: Get rid of this via mmun's plan
import { linkParams } from "../htmlbars-util/morph-utils";

function noop() {}
const EMPTY_ARRAY = Object.freeze([]);

export default class Template {
  static fromSpec(spec) {
    let children;
    if (spec.templates) {
      children = spec.templates.map(childSpec => Template.fromSpec(childSpec));
    } else {
      children = EMPTY_ARRAY;
    }

    return new Template({
      children,
      meta: spec.meta,
      arity: spec.arity,
      buildRoot: spec.buildFragment,
      buildRenderNodes: spec.buildRenderNodes,
      statements: buildStatements(spec.statements, children),
      locals: spec.locals,
      isEmpty: spec.isEmpty,
      spec: spec
    });
  }

  constructor(options) {
    this.meta = options.meta || {};
    this.arity = options.arity === undefined ? 0 : options.arity;
    this.cachedFragment = null;
    this.hasRendered = false;
    this._buildFragment = options.buildRoot || noop;
    this._buildRenderNodes = options.buildRenderNodes || noop;
    this.children = options.children || EMPTY_ARRAY;
    this._statements = options.statements || EMPTY_ARRAY;
    this.locals = options.locals || EMPTY_ARRAY;
    this.spec = options.spec || null;
    this.isEmpty = options.isEmpty || false;
    Object.seal(this);
  }

  buildRoot(env) {
    return this._getCachedFragment(env);
  }

  _getCachedFragment(env) {
    var dom = env.dom, fragment;
    if (env.useFragmentCache && dom.canClone) {
      if (this.cachedFragment === null) {
        fragment = this._buildFragment(env);
        if (this.hasRendered) {
          this.cachedFragment = fragment;
        } else {
          this.hasRendered = true;
        }
      }
      if (this.cachedFragment) {
        fragment = dom.cloneNode(this.cachedFragment, true);
      }
    } else if (!fragment) {
      fragment = this._buildFragment(env);
    }

    return fragment;
  }

  buildRenderNodes(dom, fragment, contextualElement) {
    return this._buildRenderNodes(dom, fragment, contextualElement);
  }
}

function mixin(parent, ...mixins) {
  return mixins.reduce((proto, mixin) => mixin(proto), parent);
}

function HasInternalParams(Super) {
  return class extends Super {
    constructor(...args) {
      super(...args);
      this.path = null;
      this.params = null;
      this.hash = null;
    }

    getInternalParams(env, scope, morph) {
      return link(env, scope, morph, this.path, () => {
        let params = this.params && this.params.evaluate(env, scope);
        let hash = this.hash && this.hash.evaluate(env, scope);
        return new InternalParams(params, hash);
      });
    }
  };
}

function link(env, scope, morph, path, callback) {
  if (morph.linkedParams) { return morph.linkedParams; }

  let internalParams = callback();

  if (env.hooks.linkRenderNode(morph, env, scope, path, internalParams)) {
    morph.linkedParams = internalParams;
  }

  return internalParams;
}

class Expression {
}

class Statement extends Expression {
}

class Block extends mixin(Statement, HasInternalParams) {
  constructor(node, children) {
    super(node);
    let [, path, params, hash, templateId, inverseId] = node;
    this.path = path;
    this.params = buildParams(params);
    this.hash = buildHash(hash);
    this.template = templateId === null ? null : children[templateId];
    this.inverse = inverseId === null ? null : children[inverseId];
  }

  evaluate(morph, env, scope, visitor) {
    let { params, hash } = this.getInternalParams(env, scope, morph);
    env.hooks.block(morph, env, scope, this.path, params, hash, this.template, this.inverse, visitor);
  }
}

class Inline extends mixin(Statement, HasInternalParams) {
  constructor(node) {
    super(node);
    let [, path, params, hash] = node;
    this.path = path;
    this.params = buildParams(params);
    this.hash = buildHash(hash);
  }

  evaluate(morph, env, scope, visitor) {
    let { params, hash } = this.getInternalParams(env, scope, morph);
    env.hooks.inline(morph, env, scope, this.path, params, hash, visitor);
  }
}

class Content extends Statement {
  constructor(node) {
    super(node);
    let [, path] = node;
    this.path = path;
  }

  evaluate(morph, env, scope, visitor) {
    if (isHelper(env, scope, this.path)) {
      env.hooks.inline(morph, env, scope, this.path, [], {}, visitor);
      // REFACTOR TODO: Discuss mmun's plan
      if (morph.linkedResult) {
        linkParams(env, scope, morph, '@content-helper', [morph.linkedResult], null);
      }
      return;
    }

    let params;
    if (morph.linkedParams) {
      params = morph.linkedParams.params;
    } else {
      params = [env.hooks.get(env, scope, this.path)];

      // REFACTOR NOTE: Audit this change if anything weird happens
      // This used to be outside the conditional, but we shouldn't
      // need to re-link these params if they already exist.
      linkParams(env, scope, morph, '@range', params, null);
    }

    env.hooks.range(morph, env, scope, this.path, params[0], visitor);
  }
}

function isHelper(env, scope, path) {
  return (env.hooks.keywords[path] !== undefined) || env.hooks.hasHelper(env, scope, path);
}
class Element extends mixin(Statement, HasInternalParams) {
  constructor(node) {
    super(node);
    let [, path, params, hash] = node;
    this.path = path;
    this.params = buildParams(params);
    this.hash = buildHash(hash);
  }

  evaluate(morph, env, scope, visitor) {
    let { params, hash } = this.getInternalParams(env, scope, morph);
    env.hooks.element(morph, env, scope, this.path, params, hash, visitor);
  }
}

class Attribute extends Statement {
  constructor(node) {
    super(node);
    let [, name, value] = node;
    this.name = name;
    this.value = buildExpression(value);
  }

  getInternalParams(env, scope, morph) {
    return link(env, scope, morph, '@attribute', () => {
      let value = this.value.evaluate(env, scope);
      return new InternalParams([value]);
    });
  }

  evaluate(morph, env, scope) {
    let { params } = this.getInternalParams(env, scope, morph);
    env.hooks.attribute(morph, env, scope, this.name, params[0]);
  }
}

class Component extends mixin(Statement, HasInternalParams) {
  constructor(node, children) {
    super(node);
    let [, path, attrs, templateId, inverseId] = node;
    this.path = path;
    this.hash = buildHash(attrs);
    this.templates = {
      default: children[templateId],
      inverse: children[inverseId]
    };
  }

  evaluate(morph, env, scope, visitor) {
    let { hash } = this.getInternalParams(env, scope, morph);

    morph.isDirty = morph.isSubtreeDirty = false;
    env.hooks.component(morph, env, scope, this.path, EMPTY_ARRAY, hash, this.templates, visitor);
  }
}

// these are all constructors, indexed by statement type
const StatementNodes = {
  block: Block,
  inline: Inline,
  content: Content,
  element: Element,
  attribute: Attribute,
  component: Component
};

class Params {
  constructor(params) {
    this.params = params;
  }

  evaluate(env, scope) {
    return this.params.map(param => param.evaluate(env, scope));
  }
}

class Hash {
  constructor(pairs) {
    this.pairs = pairs;
  }

  evaluate(env, scope) {
    let obj = {};
    let pairs = this.pairs;

    for (let i = 0, l = pairs.length; i < l; i += 2) {
      let key = pairs[i];
      let value = pairs[i+1];
      obj[key] = value.evaluate(env, scope);
    }

    return obj;
  }
}

class Value extends Expression {
  constructor(value) {
    super();
    this.value = value;
  }

  evaluate() {
    return this.value;
  }
}

class Get extends Expression {
  constructor(node) {
    super();
    let [, path] = node;
    this.path = path;
  }

  evaluate(env, scope) {
    return env.hooks.get(env, scope, this.path);
  }
}

class Subexpr extends mixin(Expression, HasInternalParams) {
  constructor(node) {
    super(node);
    let [, path, params, hash] = node;
    this.path = path;
    this.params = buildParams(params);
    this.hash = buildHash(hash);
  }

  evaluate(env, scope) {
    let params = this.params.evaluate(env, scope);
    let hash = this.hash.evaluate(env, scope);

    return env.hooks.subexpr(env, scope, this.path, params, hash);
  }
}

class Concat extends Expression {
  constructor(node) {
    super();
    let [, params] = node;
    this.parts = buildParams(params);
  }

  evaluate(env, scope) {
    let params = this.parts.evaluate(env, scope);
    return env.hooks.concat(env, params);
  }
}

const ExpressionNodes = {
  get: Get,
  subexpr: Subexpr,
  concat: Concat
};

export function buildStatements(statements, children) {
  if (!statements) { return EMPTY_ARRAY; }
  return statements.map(statement => new StatementNodes[statement[0]](statement, children));
}

function buildExpression(node) {
  if (typeof node !== 'object' || node === null) {
    return new Value(node);
  } else {
    return new ExpressionNodes[node[0]](node);
  }
}

function buildParams(rawParams) {
  let params = rawParams.map(rawParam => buildExpression(rawParam));
  return new Params(params);
}

function buildHash(rawPairs) {
  let pairs = [];

  for (let i = 0, l = rawPairs.length; i < l; i += 2) {
    let key = rawPairs[i];
    let expr = rawPairs[i+1];
    pairs.push(key);
    pairs.push(buildExpression(expr));
  }

  return new Hash(pairs);
}

