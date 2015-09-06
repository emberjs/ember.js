import { InternalParams } from '../htmlbars-util/morph-utils';
import { assert } from '../htmlbars-util';
import Builder from './builder';

// REFACTOR TODO: Get rid of this via mmun's plan
import { linkParams } from "../htmlbars-util/morph-utils";

const EMPTY_ARRAY = Object.freeze([]);

export default class Template {
  static fromSpec(specs) {
    let templates = new Array(specs.length);

    for (let i = 0; i < specs.length; i++) {
      let spec = specs[i];

      templates[i] = new Template({
        root: templates,
        meta: spec.meta,
        locals: spec.locals,
        isEmpty: spec.statements.length === 0,
        statements: buildStatements(spec.statements, templates),
        spec: spec
      });
    }

    return templates[templates.length - 1];
  }

  constructor(options) {
    this.meta = options.meta || {};
    this.root = options.root;
    this.arity = options.locals ? options.locals.length : 0;
    this.cachedFragment = null;
    this.hasRendered = false;
    this._statements = options.statements || EMPTY_ARRAY;
    this.locals = options.locals || EMPTY_ARRAY;
    this.spec = options.spec || null;
    this.isEmpty = options.isEmpty || false;
    Object.seal(this);
  }

  evaluate(domContext, runtime) {
    return Builder.evaluateTemplate(this, domContext, runtime);
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

    this.frontBoundary = false;
    this.backBoundary = false;
  }

  evaluate(morph, env, scope, visitor) {
    let { params, hash } = this.getInternalParams(env, scope, morph);
    env.hooks.block(morph, env, scope, this.path, params, hash, this.template, this.inverse, visitor);
  }

  render(builder) {
    let morph = builder.createMorph(this);
    builder.evaluateStatement(this, morph);
  }
}

class Inline extends mixin(Statement, HasInternalParams) {
  constructor(node) {
    super(node);
    let [, path, params, hash, unsafe] = node;
    this.path = path;
    this.params = buildParams(params);
    this.hash = buildHash(hash);
    this.unsafe = unsafe;

    this.frontBoundary = false;
    this.backBoundary = false;
  }

  evaluate(morph, env, scope, visitor) {
    let { params, hash } = this.getInternalParams(env, scope, morph);
    env.hooks.inline(morph, env, scope, this.path, params, hash, visitor);
  }

  render(builder) {
    let morph = builder.createMorph(this, this.unsafe);
    builder.evaluateStatement(this, morph);
  }
}

class Unknown extends Statement {
  constructor(node) {
    super(node);
    let [, path, unsafe] = node;
    this.path = path;
    this.unsafe = unsafe;

    this.frontBoundary = false;
    this.backBoundary = false;
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

  render(builder) {
    let morph = builder.createMorph(this, this.unsafe);
    builder.evaluateStatement(this, morph);
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

  render(/* builder */) {
    // todo
  }
}

class DynamicAttr extends Statement {
  constructor(node) {
    super(node);
    let [, name, value, namespace] = node;
    this.name = name;
    this.value = buildExpression(value);
    this.namespace = namespace;
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

  render(builder) {
    let { name, namespace } = this;
    let morph = builder.createAttrMorph(name, namespace);
    builder.evaluateStatement(this, morph);
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

    this.frontBoundary = false;
    this.backBoundary = false;
  }

  evaluate(morph, env, scope, visitor) {
    let { hash } = this.getInternalParams(env, scope, morph);

    env.hooks.component(morph, env, scope, this.path, EMPTY_ARRAY, hash, this.templates, visitor);
  }

  render(builder) {
    let morph = builder.createMorph(this);
    builder.evaluateStatement(this, morph);
  }
}

class Text {
  constructor(node) {
    let [, content] = node;
    this.content = content;
  }

  render(builder) {
    builder.appendChild(builder.dom.createTextNode(this.content));
  }
}

class Comment {
  constructor(node) {
    let [, value] = node;
    this.value = value;
  }

  render(builder) {
    builder.appendChild(builder.dom.createComment(this.value));
  }
}

class OpenElement {
  constructor(node) {
    let [, tag] = node;
    this.tag = tag;
  }

  render(builder) {
    // demeter violation; abstract better
    let element = builder.dom.createElement(this.tag, builder.contextualElement);
    builder.pushElement(element);
  }
}

class CloseElement {
  render(builder) {
    builder.appendChild(builder.popElement());
  }
}

class StaticAttr {
  constructor(node) {
    let [, name, value, namespace] = node;
    this.name = name;
    this.value = value;
    this.namespace = namespace;
  }

  render(builder) {
    assert(builder.element, "staticAttr() requires an element");
    if (this.namespace) {
      builder.dom.setAttributeNS(builder.element, this.namespace, this.name, this.value);
    } else {
      builder.dom.setAttribute(builder.element, this.name, this.value);
    }
  }
}

// these are all constructors, indexed by statement type
const StatementNodes = {
  /// dynamic statements
  block: Block,
  inline: Inline,
  unknown: Unknown,
  element: Element,
  dynamicAttr: DynamicAttr,
  component: Component,

  /// static statements
  text: Text,
  comment: Comment,
  openElement: OpenElement,
  closeElement: CloseElement,
  staticAttr: StaticAttr,
};

const BOUNDARY_CANDIDATES = {
  block: true,
  inline: true,
  unknown: true,
  component: true
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

class Helper extends mixin(Expression, HasInternalParams) {
  constructor(node) {
    super(node);
    let [, path, params, hash] = node;
    this.path = path;
    this.params = buildParams(params);
    this.hash = buildHash(hash);
  }

  evaluate(env, scope) {
    let params = this.params && this.params.evaluate(env, scope);
    let hash = this.hash && this.hash.evaluate(env, scope);

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
  helper: Helper,
  concat: Concat
};

export function buildStatements(statements, list) {
  if (statements.length === 0) { return EMPTY_ARRAY; }
  let built = statements.map(statement => {
    assert(StatementNodes[statement[0]], `Unimplemented ${statement[0]} in Template`);
    return new StatementNodes[statement[0]](statement, list);
  });

  if (statements[0][0] in BOUNDARY_CANDIDATES) {
    built[0].frontBoundary = true;
  }

  if (statements[statements.length - 1][0] in BOUNDARY_CANDIDATES) {
    built[built.length - 1].backBoundary = true;
  }

  return built;
}

function buildExpression(node) {
  if (typeof node !== 'object' || node === null) {
    return new Value(node);
  } else {
    return new ExpressionNodes[node[0]](node);
  }
}

function buildParams(rawParams) {
  if (!rawParams) { return null; }

  let params = rawParams.map(rawParam => buildExpression(rawParam));
  return new Params(params);
}

function buildHash(rawPairs) {
  if (!rawPairs) { return null; }

  let pairs = [];

  for (let i = 0, l = rawPairs.length; i < l; i += 2) {
    let key = rawPairs[i];
    let expr = rawPairs[i+1];
    pairs.push(key);
    pairs.push(buildExpression(expr));
  }

  return new Hash(pairs);
}

