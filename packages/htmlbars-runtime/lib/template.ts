import Builder from './builder';
import { intern } from '../htmlbars-util';
import { RenderResult, primeNamespace } from './render';
import { HelperInvocationReference, ConcatReference, ConstReference } from './reference';
import { Frame } from './hooks';
import { ElementStack } from './builder';

console.log("HI");

interface Bounds {
  parentNode(): Node;
  firstNode(): Node;
  lastNode(): Node;
}

interface Reference {}

import {
  HelperMorph,
  ValueMorph,
  // SimpleHelperMorph
} from './morphs/inline';

import { Morph } from './morph';

import {
  BlockHelperMorph
} from "./morphs/block";

import { AttrMorph, SetPropertyMorph } from "./morphs/attrs";

const EMPTY_ARRAY = Object.freeze([]);

export default class Template {
  static fromSpec(specs) {
    let templates = new Array(specs.length);

    for (let i = 0; i < specs.length; i++) {
      let spec = specs[i];

      templates[i] = new Template({
        statements: buildStatements(spec.statements, templates),
        root: templates,
        position: i,
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
      position: null,
      meta: null,
      locals: null,
      isEmpty: statements.length === 0,
      spec: null
    });
  }

  meta: Object;
  root: Template[];
  position: number;
  arity: number;
  statements: StatementSyntax[];
  locals: string[];
  spec: any[];
  isEmpty: boolean;

  constructor(options) {
    this.meta = options.meta || {};
    this.root = options.root;
    this.position = options.position;
    this.arity = options.locals ? options.locals.length : 0;
    this.statements = options.statements || EMPTY_ARRAY;
    this.locals = options.locals || EMPTY_ARRAY;
    this.spec = options.spec || null;
    this.isEmpty = options.isEmpty || false;
    Object.seal(this);
  }

  prettyPrint() {
    function pretty(obj) {
      if (typeof obj.prettyPrint === 'function') return obj.prettyPrint();
      else throw new Error(`Cannot pretty print ${obj.constructor.name}`);
    }

    return this.root.map(template => {
      return template.statements.map(statement => pretty(statement));
    });
  }

  evaluate(morph, frame): RenderResult {
    let builder = new Builder(morph, frame);

    this.statements.forEach(builder.render, builder);

    let morphs = builder.morphs();
    let bounds = builder.bounds();

    return new RenderResult({ morph, morphs, bounds, template: this, locals: this.locals });
  }

  render(self, env, options, blockArguments) {
    let scope = env
      .createRootScope()
      .initTopLevel(self, this.locals, blockArguments, options.hostOptions);

    let frame = env.pushFrame(scope);

    primeNamespace(env);

    let rootMorph = new RootMorph(options.appendTo);

    return this.evaluate(rootMorph, frame);
  }
}

class RootMorph {
  parentNode: HTMLElement;
  
  constructor(element) {
    this.parentNode = element;
  }
}

interface PrettyPrintable {
  prettyPrint(): string;
}

interface ExpressionSyntax {
  evaluate(frame: Frame): Reference;
}

interface PrettyPrintableExpressionSyntax extends ExpressionSyntax, PrettyPrintable {}

interface StaticStatementSyntax extends PrettyPrintable {
  evaluate(stack: ElementStack): void;
  isStatic: boolean;
}

interface StatementSyntax extends PrettyPrintable {
  evaluate(stack: ElementStack, frame: Frame): Morph;
  isStatic: boolean;
}

class ParamExpressions implements ExpressionSyntax {
  params: Params;
  hash: Hash;
  
  constructor({ params, hash }) {
    this.params = params;
    this.hash = hash;
  }

  evaluate(frame) {
    let { params, hash } = this;
    return { params: params.evaluate(frame), hash: hash.evaluate(frame) };
  }
}

export class Block extends DynamicExpression implements StatementSyntax {
  static fromSpec(node, children) {
    let [, path, params, hash, templateId, inverseId] = node;

    return new Block({
      path,
      params: ParamsAndHash.fromSpec(params, hash),
      templates: Templates.fromSpec(templateId, inverseId, children)
    });
  }

  static build(options) {
    return new Block(options);
  }

  path: string;
  params: Params;
  templates: Templates;

  constructor(options) {
    super();
    this.path = options.path;
    this.params = options.params;
    this.templates = options.templates;
  }

  prettyPrint() {
    return `Block(${this.path}) { params=${this.params.prettyPrint()} templates=${this.templates.prettyPrint()} }`;
  }

  evaluate(stack) {
    let { path, params, templates } = this;
    return stack.createMorph(BlockHelperMorph, { path, params, templates });
  }
}

class StaticExpression {
  isStatic: boolean;
  
  constructor() {
    this.isStatic = true;
  }
}

class DynamicExpression {
  isStatic: boolean;

  constructor() {
    this.isStatic = false;
  }
}

export class Inline extends DynamicExpression implements StatementSyntax {
  static fromSpec(node) {
    let [, path, params, hash, trust] = node;

    return new Inline({
      path,
      trustingMorph: trust,
      params: ParamsAndHash.fromSpec(params, hash),
    });
  }

  static build(_path, params, trust) {
    let path = internPath(_path);
    return new Inline({ path, params, trustingMorph: trust });
  }

  path: string;
  trustingMorph: boolean;
  params: Params;

  constructor(options) {
    super();
    this.path = options.path;
    this.trustingMorph = options.trustingMorph;
    this.params = options.params;
  }

  prettyPrint() {
    return `Inline(${this.path}) { params=${this.params.prettyPrint()} trusted=${this.trustingMorph} }`; 
  }

  evaluate(stack) {
    let { path, params, trustingMorph } = this;
    return stack.createMorph(HelperMorph, { path, params, trustingMorph });
  }
}

export class Unknown extends DynamicExpression implements StatementSyntax {
  static fromSpec(node) {
    let [, path, unsafe] = node;

    return new Unknown({ ref: new Ref(path), unsafe });
  }

  static build(path, unsafe) {
    return new Unknown({ ref: Ref.build(path), unsafe });
  }

  ref: Ref;
  trustingMorph: boolean;

  constructor(options) {
    super();
    this.ref = options.ref;
    this.trustingMorph = !!options.unsafe;
  }

  prettyPrint() {
    return `Unknown(${this.ref.prettyPrint()}) { trust=${this.trustingMorph} }`;
  }

  evaluate(stack, frame) {
    let { ref, trustingMorph } = this;
    ref = ref.isHelper(frame) ? frame.lookupHelper(ref.path()) : ref;
    return stack.createMorph(ValueMorph, { ref, trustingMorph });
  }
}

/*
export class Modifier implements StatementSyntax {
  static fromSpec(node) {
    let [, path, params, hash] = node;

    return new Modifier({
      path,
      params: Params.fromSpec(params),
      hash: Hash.fromSpec(hash)
    });
  }

  static build(path, options) {
    return new Modifier({
      path,
      params: options.params,
      hash: options.hash
    });
  }

  constructor(options) {
    this.path = options.path;
    this.params = options.params;
    this.hash = options.hash;
  }

  evaluate(stack) {
    return stack.createMorph(Modifier);
  }
}
*/

interface AttributeSyntax {
  name: string;
  namespace?: string;
}

export class DynamicProp extends DynamicExpression implements AttributeSyntax, StatementSyntax {
  static fromSpec(node) {
    let [, name, value, namespace] = node;

    return new DynamicProp({
      name,
      namespace,
      value: buildExpression(value)
    });
  }

  static build(name, value, namespace=null) {
    return new DynamicProp({ name, value, namespace });
  }

  name: string;
  value: ExpressionSyntax & PrettyPrintable;

  constructor(options) {
    super();
    this.name = options.name;
    this.value = options.value;
  }

  prettyPrint() {
    let { name, value } = this;

    return `DynamicProp { ${name}=${value.prettyPrint()} }`;
  }

  evaluate(stack) {
    let { name, value } = this;
    return stack.createMorph(SetPropertyMorph, { name, value });
  }
}

export class DynamicAttr extends DynamicExpression implements AttributeSyntax, StatementSyntax {
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

  name: string;
  value: ExpressionSyntax & PrettyPrintable;
  namespace: string;

  constructor(options) {
    super();
    this.name = options.name;
    this.value = options.value;
    this.namespace = options.namespace;
  }

  prettyPrint() {
    let { name, value, namespace } = this;

    if (namespace) {
      return `DynamicAttr { ${name}=${value.prettyPrint()}; namespace=${namespace} }`;
    } else {
      return `DynamicAttr { ${name}=${value.prettyPrint()} }`;
    }
  }

  evaluate(stack) {
    let { name, value, namespace } = this;
    return stack.createMorph(AttrMorph, { name, value, namespace });
  }
}

export class Component extends DynamicExpression implements StatementSyntax {
  static fromSpec(node, children) {
    let [, path, attrs, templateId, inverseId] = node;

    return new Component({
      path,
      hash: Hash.fromSpec(attrs),
      templates: Templates.fromSpec(templateId, inverseId, children)
    });
  }

  static build(path, options) {
    return new Component({
      path,
      hash: options.hash || null,
      templates: Templates.build(options.default, options.inverse)
    });
  }

  path: string;
  hash: Hash;
  templates: Templates;

  constructor(options) {
    super();
    this.path = options.path;
    this.hash = options.hash;
    this.templates = options.templates;
  }

  prettyPrint() {
    let { path, hash, templates } = this;
    return `Component <${path} ${hash.prettyPrint()} ${templates.prettyPrint()}>`;
  }

  evaluate(stack, frame) {
    let { path, hash, templates } = this;

    if (frame.hasHelper([path])) {
      return stack.createMorph(BlockHelperMorph, { path: [path], params: ParamsAndHash.build(Params.empty(), hash), templates });
    } else {
      return stack.createMorph(FallbackMorph, { path, hash, template: templates._default });
    }
  }
}

class FallbackMorph extends Morph {
  tag: string;
  template: Template;
  attrs: AttributeSyntax[];
  
  init({ path, hash, template }) {
    this.tag = path;
    this.template = template;

    let attrs = [];

    hash.forEach((name, value) => {
      if (value.isStatic) attrs.push(StaticAttr.build(name, value.inner()));
      else attrs.push(DynamicAttr.build(name, value));
    });

    this.attrs = attrs;
  }

  append(stack) {
    let { tag, attrs, template } = this;

    stack.openElement(tag);
    attrs.forEach(attr => stack.appendStatement(attr));
    if (!template.isEmpty) stack.appendMorph(FallbackContents, { template });
    stack.closeElement();
  }
}

class FallbackContents extends Morph {
  template: Template;
  
  init({ template }) {
    this.template = template;
  }

  append() {
    this.template.evaluate(this, this.frame);
  }
}

export class Text extends StaticExpression implements StaticStatementSyntax {
  static fromSpec(node) {
    let [, content] = node;

    return new Text({ content });
  }

  static build(content) {
    return new Text({ content });
  }

  content: string;

  constructor(options) {
    super();
    this.content = options.content;
  }

  prettyPrint() {
    return `Text(${JSON.stringify(this.content)})`;
  }

  evaluate(stack) {
    stack.appendText(this.content);
  }
}

export class Comment extends StaticExpression implements StaticStatementSyntax {
  static fromSpec(node) {
    let [, value] = node;

    return new Comment({ value });
  }

  static build(value) {
    return new Comment({ value });
  }

  value: string;

  constructor(options) {
    super();
    this.value = options.value;
  }
  
  prettyPrint() {
    return `Comment <!-- ${this.value} -->`;
  }

  evaluate(stack) {
    stack.appendComment(this.value);
  }
}

export class OpenElement extends StaticExpression implements StaticStatementSyntax {
  static fromSpec(node) {
    let [, tag] = node;

    return new OpenElement({ tag });
  }

  static build(tag) {
    return new OpenElement({ tag });
  }

  tag: string;

  constructor(options) {
    super();
    this.tag = options.tag;
  }

  prettyPrint() {
    return `<${this.tag}>`;
  }

  evaluate(stack) {
    stack.openElement(this.tag);
  }
}

export class CloseElement extends StaticExpression implements StaticStatementSyntax {
  static fromSpec() {
    return new CloseElement();
  }

  static build() {
    return new CloseElement();
  }

  prettyPrint() {
    return `</>`;
  }

  evaluate(stack) {
    stack.closeElement();
  }
}

export class StaticAttr extends StaticExpression implements AttributeSyntax, StaticStatementSyntax {
  static fromSpec(node) {
    let [, name, value, namespace] = node;

    return new StaticAttr({ name, value, namespace });
  }

  static build(name, value, namespace=null) {
    return new StaticAttr({ name, value, namespace });
  }

  name: string;
  value: string;
  namespace: string;

  constructor(options) {
    super();
    this.name = options.name;
    this.value = options.value;
    this.namespace = options.namespace;
  }

  prettyPrint() {
    let { name, value, namespace } = this;

    if (namespace) {
      return `StaticAttr { ${name}=${JSON.stringify(value)}; namespace=${namespace} }`;
    } else {
      return `StaticAttr { ${name}=${JSON.stringify(value)} }`;
    }
  }

  evaluate(stack) {
    let { name, value, namespace } = this;

    if (namespace) {
      stack.setAttributeNS(name, value, namespace);
    } else {
      stack.setAttribute(name, value);
    }
  }
}

// these are all constructors, indexed by statement type
const StatementNodes = {
  /// dynamic statements
  block: Block,
  inline: Inline,
  unknown: Unknown,
  //modifier: Modifier,
  dynamicAttr: DynamicAttr,
  dynamicProp: DynamicProp,
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

class EvaluatedParams implements Reference {
  
}

class EvaluatedHash implements Reference {
  _keys: any[];
  _values: any[]; // TODO: Reference

  constructor({ keys, values }) {
    this._keys = keys;
    this._values = values;
  }

  forEach(callback) {
    let { _keys, _values } = this;

    for (let i = 0, l = _keys.length; i < l; i++) {
      callback(_keys[i], _values[i]);
    }
  }
}

export class Value extends StaticExpression implements ExpressionSyntax {
  static fromSpec(value) {
    return new Value(value);
  }

  static build(value) {
    return new Value(value);
  }

  _value: boolean | string | number;

  constructor(value) {
    super();
    this._value = value;
  }

  prettyPrint() {
    return JSON.stringify(this._value);
  }

  inner() {
    return this._value;
  }

  evaluate() {
    return new ConstReference(this._value);
  }
}

export class Get implements ExpressionSyntax {
  static fromSpec(node) {
    let [, parts] = node;

    return new Get({ ref: new Ref(parts) });
  }

  static build(path) {
    return new Get({ ref: Ref.build(path) });
  }
  
  ref: Ref;

  constructor(options) {
    this.ref = options.ref;
  }

  prettyPrint() {
    return `Get ${this.ref.prettyPrint()}`;
  }

  evaluate(frame) {
    return this.ref.evaluate(frame);
  }
}

// intern paths because they will be used as keys
function internPath(path) {
  return path.splice('.').map(intern);
}

// this is separated out from Get because Unknown also has a ref, but it
// may turn out to be a helper
class Ref implements ExpressionSyntax {
  static build(path) {
    return new Ref(internPath(path));
  }

  parts: string[];

  constructor(parts) {
    this.parts = parts;
  }

  prettyPrint() {
    return this.parts.join('.');
  }

  evaluate(frame) {
    let parts = this.parts;
    let path = frame.scope().getBaseReference(parts[0]);

    for (let i = 1; i < parts.length; i++) {
      path = path.get(parts[i]);
    }

    return path;
  }

  path() {
    return this.parts;
  }

  isHelper(frame) {
    return frame.hasHelper(this.parts);
  }
}

export class Helper implements ExpressionSyntax {
  static fromSpec(node) {
    let [, path, params, hash] = node;

    return new Helper({
      path,
      params: ParamsAndHash.fromSpec(params, hash)
    });
  }

  static build(path, params, hash) {
    return new Helper({ path, params: { params, hash } });
  }

  path: String;
  params: ParamsAndHash;

  constructor(options) {
    this.path = options.path;
    this.params = options.params;
  }

  evaluate(frame) {
    let helper = frame.lookupHelper(this.path);
    let { params } = this;
    return HelperInvocationReference.fromStatements({ helper, params, frame });
  }
}

export class Concat implements ExpressionSyntax {
  static fromSpec(node) {
    let [, params] = node;

    return new Concat({ parts: Params.fromSpec(params) });
  }

  static build(parts) {
    return new Concat({ parts });
  }

  parts: Params;

  constructor(options) {
    this.parts = options.parts;
  }

  evaluate(frame) {
    return new ConcatReference(this.parts.map(p => p.evaluate(frame)));
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

class ParamsAndHash implements PrettyPrintableExpressionSyntax {
  static fromSpec(params, hash) {
    return new ParamsAndHash({ params: Params.fromSpec(params), hash: Hash.fromSpec(hash) });
  }

  static build(params, hash) {
    return new ParamsAndHash({ params, hash });
  }
  
  params: Params;
  hash: Hash;

  constructor({ params, hash }) {
    this.params = params;
    this.hash = hash;
  }

  prettyPrint() {
    return `ParamsAndHash { params=${this._params.prettyPrint()}, hash=${this._hash.prettyPrint()} }`;
  }
  
  evaluate(frame) {
    throw new Error("TODO: unimplemented evaluate for ParamsAndHash");
  }
}

interface EnumerableCallback<T> {
  (value: T): void;
}

class Enumerable<T> {
  forEach(callback: EnumerableCallback<T>) {
    throw new Error(`unimplemented forEach for ${this.constructor.name}`);
  }
  
  map(callback) {
    let out = [];
    this.forEach(val => out.push(callback(val)));
    return out;
  }
}

class Params extends Enumerable<ExpressionSyntax> implements PrettyPrintableExpressionSyntax {
  static fromSpec(exprs) {
    if (!exprs || exprs.length === 0) return Params.empty();
    return new Params(exprs.map(buildExpression));
  }

  static build(exprs) {
    return new Params(exprs);
  }

  static _empty;

  static empty() {
    return (this._empty = this._empty || new Params([]));
  }

  params: PrettyPrintableExpressionSyntax[];

  constructor(exprs) {
    super();
    this.params = exprs;
  }

  forEach(callback) {
    this.params.forEach(callback);
  }

  prettyPrint() {
    return `Params [ ${this.params.map(p => p.prettyPrint()).join(', ')} ]`;
  }
  
  evaluate(frame) {
    throw new Error("TODO: unimplemented evaluate for Params");
  }
}

export class Hash implements PrettyPrintableExpressionSyntax {
  static fromSpec(rawPairs) {
    if (!rawPairs) { return Hash.empty(); }

    let keys = [];
    let values = [];

    for (let i = 0, l = rawPairs.length; i < l; i += 2) {
      let key = rawPairs[i];
      let expr = rawPairs[i+1];
      keys.push(key);
      values.push(buildExpression(expr));
    }

    return new Hash({ keys, values });
  }

  static build(hash) {
    if (hash === undefined) { return Hash.empty(); }
    let keys = [];
    let values = [];

    Object.keys(hash).forEach(key => {
      keys.push(key);
      values.push(hash[key]);
    });

    return new Hash({ keys, values });
  }

  static _empty;

  static empty() {
    return (this._empty = this._empty || new Hash({ keys: EMPTY_ARRAY, values: EMPTY_ARRAY }));
  }

  keys: any[];
  values: PrettyPrintableExpressionSyntax[];

  constructor({ keys, values }) {
    this.keys = keys;
    this.values = values;
  }

  entries(): Enumerable<[string, ExpressionSyntax]> {
    throw new Error("unimplemented entries for Hash");
  }

  forEach(callback) {
    let { keys, values } = this;
    keys.forEach((key, i) => callback(key, values[i]));
  }

  prettyPrint() {
    let inside = this.keys.map((k, i) => `${k}=${this.values[i].prettyPrint()}`).join(', ');
    return `Hash { ${inside} }`;
  }

  evaluate(frame) {
    let { keys, values } = this;
    let out = new Array(values.length);

    for (let i = 0, l = values.length; i < l; i++) {
      out[i] = values[i].evaluate(frame);
    }

    return new EvaluatedHash({ keys, values: out });
  }
}

class Templates implements ExpressionSyntax {
  static fromSpec(templateId, inverseId, children) {
    return new Templates({
      template: templateId === null ? null : children[templateId],
      inverse: inverseId === null ? null : children[inverseId],
    });
  }

  static build(template, inverse) {
    return new Templates({ template, inverse });
  }

  _default: Template;
  _inverse: Template;

  constructor({ template, inverse }) {
    this._default = template;
    this._inverse = inverse;
  }

  prettyPrint() {
    let { _default, _inverse } = this;
    return `Templates { default=${_default ? _default.position : 'none'}, inverse=${_inverse ? _inverse.position : 'none'} }`;
  }
  
  evaluate(frame) {
    throw new Error("unimplemented evaluate for ExpressionSyntax");
  }
}

export let builders = {
  value: Value.build,
  hash: Hash.build
};

export class TemplateBuilder {
  statements: any[];
  
  constructor() {
    this.statements = [];
  }

  template() {
    return Template.fromStatements(this.statements); // jshint ignore:line
  }

  specExpr(node) {
    return buildExpression(node);
  }

  params(params, hash) {
    return new ParamExpressions({ params, hash });
  }
  
  openElement(tagName: string) {
    return OpenElement.build(tagName);
  }
  
  closeElement() {
    return CloseElement.build();
  }
  
  staticAttr(key: string, value: string) {
    return StaticAttr.build(key, value);
  }
  
  dynamicAttr(key: string, value: ExpressionSyntax, namespace: string=null) {
    return DynamicAttr.build(key, value);
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