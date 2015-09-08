import { InternalParams } from '../htmlbars-util/morph-utils';
import { assert } from '../htmlbars-util';
import Builder, { BuilderResult } from './builder';
import { EMPTY_RENDER_RESULT, RenderResult, primeNamespace } from './render';

// REFACTOR TODO: Get rid of this via mmun's plan
import { linkParams } from "../htmlbars-util/morph-utils";

const EMPTY_ARRAY = Object.freeze([]);
let EMPTY_PARAMS, EMPTY_HASH;

class TopLevelRenderResult {
  constructor(options) {
    this.inner = options.inner;
    this.root = options.root;
    this.env = options.env;
  }

  revalidate(...args) {
    this.inner.revalidate(this.env, ...args);
  }

  rerender(...args) {
    this.inner.rerender(this.env, ...args);
  }
}

export default class Template {
  static fromSpec(specs) {
    let templates = new Array(specs.length);

    for (let i = 0; i < specs.length; i++) {
      let spec = specs[i];

      templates[i] = new Template({
        statements: buildStatements(spec.statements, templates),
        root: templates,
        meta: spec.meta,
        locals: spec.locals,
        isEmpty: spec.statements.length === 0,
        spec: spec
      });
    }

    return templates[templates.length - 1];
  }

  static fromStatements(statements) {
    return new Template({
      statements,
      root: null,
      meta: null,
      locals: null,
      isEmpty: statements.length === 0,
      spec: null
    });
  }

  constructor(options) {
    this.meta = options.meta || {};
    this.root = options.root;
    this.arity = options.locals ? options.locals.length : 0;
    this.cachedFragment = null;
    this.hasRendered = false;
    this.statements = options.statements || EMPTY_ARRAY;
    this.locals = options.locals || EMPTY_ARRAY;
    this.spec = options.spec || null;
    this.isEmpty = options.isEmpty || false;
    Object.seal(this);
  }

  evaluate(morph, runtime) {
    // runtime is { env, scope, visitor }
    let builder = new Builder(morph, runtime);
    builder.evaluateTemplate(this);
    morph.childMorphs = builder.morphs;
    return new BuilderResult({ morphs: builder.morphs, statements: builder.statements });
  }

  render(self, env, options, blockArguments) {
    if (this.isEmpty) { return EMPTY_RENDER_RESULT; }

    let scope = env.hooks.createFreshScope();
    env.hooks.setupScope(env, scope, self, this.locals, blockArguments, options && options.hostOptions);

    primeNamespace(env);

    let rootNode = new env.dom.MorphClass(env.dom).initForAppendingToElement(env.appendTo).initRoot();

    let result = RenderResult.build(rootNode, env, scope, this);
    return new TopLevelRenderResult({ env, inner: result, root: rootNode });
  }

  renderIn(morph, env, scope) {
    if (this.isEmpty) { return EMPTY_RENDER_RESULT; }

    return RenderResult.build(morph, env, scope, this);
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

function Dynamic(Super) {
  return class extends Super {
    constructor(...args) {
      super(...args);
      this.frontBoundary = false;
      this.backBoundary = false;
    }
  };
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

export class Block extends mixin(Statement, Dynamic, HasInternalParams) {
  static fromSpec(node, children) {
    let [, path, params, hash, templateId, inverseId] = node;
    return new Block({
      path: path,
      params: buildParams(params),
      hash: buildHash(hash),
      template: templateId === null ? null : children[templateId],
      inverse: inverseId === null ? null : children[inverseId]
    });
  }

  static build(options) {
    return new Block(options);
  }

  constructor(options) {
    super();

    this.path = options.path;
    this.params = options.params;
    this.hash = options.hash;
    this.template = options.template;
    this.inverse = options.inverse;
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

export class Inline extends mixin(Statement, Dynamic, HasInternalParams) {
  static fromSpec(node) {
    let [, path, params, hash, unsafe] = node;

    return new Inline({
      path,
      unsafe,
      params: buildParams(params),
      hash: buildHash(hash)
    });
  }

  static build(path, options) {
    return new Inline({
      path,
      unsafe: options && options.unsafe,
      params: options && options.params || EMPTY_PARAMS,
      hash: options && options.hash || EMPTY_HASH
    });
  }

  constructor(options) {
    super();

    this.path = options.path;
    this.unsafe = options.unsafe;
    this.params = options.params;
    this.hash = options.hash;
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

export class Unknown extends mixin(Statement, Dynamic) {
  static fromSpec(node) {
    let [, path, unsafe] = node;

    return new Unknown({ path, unsafe });
  }

  static build(path, unsafe) {
    return new Unknown({ path, unsafe });
  }

  constructor(options) {
    super();

    this.path = options.path;
    this.unsafe = options.unsafe;
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

export class Modifier extends mixin(Statement, HasInternalParams) {
  static fromSpec(node) {
    let [, path, params, hash] = node;

    return new Modifier({
      path,
      params: buildParams(params),
      hash: buildHash(hash)
    });
  }

  static build(path, options) {
    return new Modifier({
      path,
      params: options.params || EMPTY_PARAMS,
      hash: options.hash || EMPTY_HASH
    });
  }

  constructor(options) {
    super();

    this.path = options.path;
    this.params = options.params;
    this.hash = options.hash;
  }

  evaluate(morph, env, scope, visitor) {
    let { params, hash } = this.getInternalParams(env, scope, morph);
    env.hooks.element(morph, env, scope, this.path, params, hash, visitor);
  }

  render(builder) {
    let morph = builder.createElementMorph();
    builder.evaluateStatement(this, morph);
  }
}

export class DynamicAttr extends Statement {
  static fromSpec(node) {
    let [, name, value, namespace] = node;

    return new DynamicAttr({
      name,
      namespace,
      value: buildExpression(value)
    });
  }

  static build(name, value, namespace=null) {
    return new DynamicAttr({ name, value, namespace });
  }

  constructor(options) {
    super();

    this.name = options.name;
    this.value = options.value;
    this.namespace = options.namespace;
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

export class Component extends mixin(Statement, Dynamic, HasInternalParams) {
  static fromSpec(node, children) {
    let [, path, attrs, templateId, inverseId] = node;

    return new Component({
      path,
      hash: buildHash(attrs),
      templates: {
        default: children[templateId],
        inverse: children[inverseId]
      }
    });
  }

  static build(path, options) {
    return new Component({
      path,
      hash: options.hash || null,
      templates: {
        default: options.default || null,
        inverse: options.inverse || null
      }
    });
  }

  constructor(options) {
    super();

    this.path = options.path;
    this.hash = options.hash;
    this.templates = options.templates;
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

export class Text {
  static fromSpec(node) {
    let [, content] = node;

    return new Text({ content });
  }

  static build(content) {
    return new Text({ content });
  }

  constructor(options) {
    this.content = options.content;
  }

  render(builder, dom) {
    builder.appendChild(dom.createTextNode(this.content));
  }
}

export class Comment {
  static fromSpec(node) {
    let [, value] = node;

    return new Comment({ value });
  }

  static build(value) {
    return new Comment({ value });
  }

  constructor(options) {
    this.value = options.value;
  }

  render(builder, dom) {
    builder.appendChild(dom.createComment(this.value));
  }
}

export class OpenElement {
  static fromSpec(node) {
    let [, tag] = node;

    return new OpenElement({ tag });
  }

  static build(tag) {
    return new OpenElement({ tag });
  }

  constructor(options) {
    this.tag = options.tag;
  }

  render(builder) {
    builder.openElement(this.tag);
  }
}

export class CloseElement {
  static fromSpec() {
    return new CloseElement();
  }

  static build() {
    return new CloseElement();
  }

  render(builder) {
    builder.closeElement();
  }
}

export class StaticAttr {
  static fromSpec(node) {
    let [, name, value, namespace] = node;

    return new StaticAttr({ name, value, namespace });
  }

  static build(name, value, namespace=null) {
    return new StaticAttr({ name, value, namespace });
  }

  constructor(options) {
    this.name = options.name;
    this.value = options.value;
    this.namespace = options.namespace;
  }

  render(builder, dom) {
    assert(builder.element, "staticAttr() requires an element");
    if (this.namespace) {
      dom.setAttributeNS(builder.element, this.namespace, this.name, this.value);
    } else {
      dom.setAttribute(builder.element, this.name, this.value);
    }
  }
}

// these are all constructors, indexed by statement type
const StatementNodes = {
  /// dynamic statements
  block: Block,
  inline: Inline,
  unknown: Unknown,
  modifier: Modifier,
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

export class Params {
  static build(...args) {
    if (args.length === 0) { return EMPTY_PARAMS; }
    return new Params(args);
  }

  constructor(params) {
    this.params = params;
  }

  evaluate(env, scope) {
    return this.params.map(param => param.evaluate(env, scope));
  }
}

EMPTY_PARAMS = new Params([]);

export class Hash {
  static build(hash) {
    if (hash === undefined) { return EMPTY_HASH; }
    let pairs = [];
    Object.keys(hash).forEach(key => pairs.push(key, hash[key]));
    return new Hash(pairs);
  }

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

EMPTY_HASH = new Hash([]);

export class Value extends Expression {
  static fromSpec(value) {
    return new Value(value);
  }

  static build(value) {
    return new Value(value);
  }

  constructor(value) {
    super();
    this.value = value;
  }

  evaluate() {
    return this.value;
  }
}

export class Get extends Expression {
  static fromSpec(node) {
    let [, path] = node;

    return new Get({ path });
  }

  static build(path) {
    return new Get({ path });
  }

  constructor(options) {
    super();

    this.path = options.path;
  }

  evaluate(env, scope) {
    return env.hooks.get(env, scope, this.path);
  }
}

export class Helper extends mixin(Expression, HasInternalParams) {
  static fromSpec(node) {
    let [, path, params, hash] = node;

    return new Helper({
      path,
      params: buildParams(params),
      hash: buildHash(hash)
    });
  }

  static build(path, params=EMPTY_PARAMS, hash=EMPTY_HASH) {
    return new Helper({ path, params, hash });
  }

  constructor(options) {
    super();

    this.path = options.path;
    this.params = options.params;
    this.hash = options.hash;
  }

  evaluate(env, scope) {
    let params = this.params && this.params.evaluate(env, scope);
    let hash = this.hash && this.hash.evaluate(env, scope);

    return env.hooks.subexpr(env, scope, this.path, params, hash);
  }
}

export class Concat extends Expression {
  static fromSpec(node) {
    let [, params] = node;

    return new Concat({ parts: buildParams(params) });
  }

  static build(parts=EMPTY_PARAMS) {
    return new Concat({ parts });
  }

  constructor(options) {
    super();

    this.parts = options.parts;
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
  let built = statements.map(statement => StatementNodes[statement[0]].fromSpec(statement, list));

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
    return Value.fromSpec(node);
  } else {
    return ExpressionNodes[node[0]].fromSpec(node);
  }
}

function buildParams(rawParams) {
  if (!rawParams) { return EMPTY_PARAMS; }

  let params = rawParams.map(rawParam => buildExpression(rawParam));
  return new Params(params);
}

function buildHash(rawPairs) {
  if (!rawPairs) { return EMPTY_HASH; }

  let pairs = [];

  for (let i = 0, l = rawPairs.length; i < l; i += 2) {
    let key = rawPairs[i];
    let expr = rawPairs[i+1];
    pairs.push(key);
    pairs.push(buildExpression(expr));
  }

  return new Hash(pairs);
}

export let builders = {
  value: Value.build,
  params: Params.build,
  hash: Hash.build
};

export class TemplateBuilder {
  constructor() {
    this.statements = [];
  }

  template() {
    return Template.fromStatements(this.statements);
  }

  specExpr(node) {
    return buildExpression(node);
  }
}

// export all statement nodes as builders via their static `build` method
Object.keys(StatementNodes).forEach(key => {
  let builderKey = `${key[0].toLowerCase()}${key.slice(1)}`;
  builders[builderKey] = StatementNodes[key].build;
});

Object.keys(builders).forEach(key => {
  TemplateBuilder.prototype[key] = function(...args) {
    this.statements.push(builders[key](...args));
  };
});
