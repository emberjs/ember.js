import Builder from './builder';
import { intern } from './utils';
import { RenderResult } from './render';
import { HelperInvocationReference, ConcatReference, ConstReference } from './reference';
import { Frame, ChainableReference } from './hooks';
import { ElementStack } from './builder';
import { Dict } from './utils';

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

type Spec = any[];

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

    let morphs = builder.morphList();
    let bounds = builder.bounds();

    return new RenderResult({ morph, morphs, bounds, template: this, locals: this.locals });
  }

  render(self, env, options, blockArguments) {
    let scope = env
      .createRootScope()
      .initTopLevel(self, this.locals, blockArguments, options.hostOptions);

    let frame = env.pushFrame(scope);

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
  evaluate(frame: Frame): ChainableReference;
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

type PathSexp = string[];
type ExpressionSexp = any[];
type ParamsSexp = ExpressionSexp[];
type HashSexp = any[];

type BlockSexp = [string, PathSexp, ParamsSexp, HashSexp, number, number];

export class Block extends DynamicExpression implements StatementSyntax {
  static fromSpec(sexp: BlockSexp, children: Template[]): Block {
    let [, path, params, hash, templateId, inverseId] = sexp;

    return new Block({
      path,
      params: ParamsAndHash.fromSpec(params, hash),
      templates: Templates.fromSpec(templateId, inverseId, children)
    });
  }

  static build(options): Block {
    return new Block(options);
  }

  path: string[];
  params: ParamsAndHash;
  templates: Templates;

  constructor(options: { path: string[], params: ParamsAndHash, templates: Templates }) {
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

type InlineSexp = [string, string[], ParamsSexp, HashSexp, boolean];

export class Inline extends DynamicExpression implements StatementSyntax {
  static fromSpec(sexp: InlineSexp) {
    let [, path, params, hash, trust] = sexp;

    return new Inline({
      path,
      trustingMorph: trust,
      params: ParamsAndHash.fromSpec(params, hash),
    });
  }

  static build(_path: string, params: ParamsAndHash, trust: boolean) {
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

  evaluate(stack: ElementStack): Morph {
    let { path, params, trustingMorph } = this;
    return stack.createMorph(HelperMorph, { path, params, trustingMorph });
  }
}

type UnknownSexp = [string, PathSexp, boolean];

export class Unknown extends DynamicExpression implements StatementSyntax {
  static fromSpec(sexp: UnknownSexp): Unknown {
    let [, path, unsafe] = sexp;

    return new Unknown({ ref: new Ref(path), unsafe });
  }

  static build(path: string, unsafe: boolean): Unknown {
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

  evaluate(stack: ElementStack, frame: Frame): Morph {
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

type DynamicPropSexp = [string, string, ExpressionSexp, string];

export class DynamicProp extends DynamicExpression implements AttributeSyntax, StatementSyntax {
  static fromSpec(sexp: DynamicPropSexp): DynamicProp {
    let [, name, value, namespace] = sexp;

    return new DynamicProp({
      name,
      namespace,
      value: buildExpression(value)
    });
  }

  static build(name: string, value: any, namespace: string=null): DynamicProp {
    return new DynamicProp({ name, value, namespace });
  }

  private name: string;
  private value: PrettyPrintableExpressionSyntax;

  constructor(options: { name: string, value: PrettyPrintableExpressionSyntax }) {
    super();
    this.name = options.name;
    this.value = options.value;
  }

  prettyPrint() {
    let { name, value } = this;

    return `DynamicProp { ${name}=${value.prettyPrint()} }`;
  }

  evaluate(stack: ElementStack): Morph {
    let { name, value } = this;
    return stack.createMorph(SetPropertyMorph, { name, value });
  }
}

type DynamicAttrSexp = [string, string, ExpressionSexp, string];

export class DynamicAttr extends DynamicExpression implements AttributeSyntax, StatementSyntax {
  static fromSpec(sexp: DynamicAttrSexp): DynamicAttr {
    let [, name, value, namespace] = sexp;

    return new DynamicAttr({
      name,
      namespace,
      value: buildExpression(value)
    });
  }

  static build(name: string, value: PrettyPrintableExpressionSyntax, namespace: string=null): DynamicAttr {
    return new DynamicAttr({ name, value, namespace });
  }

  name: string;
  value: PrettyPrintableExpressionSyntax;
  namespace: string;

  constructor(options: { name: string, value: PrettyPrintableExpressionSyntax, namespace: string }) {
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

  evaluate(stack: ElementStack): Morph {
    let { name, value, namespace } = this;
    return stack.createMorph(AttrMorph, { name, value, namespace });
  }
}

type ComponentSexp = [string, PathSexp, HashSexp, number, number];

export class Component extends DynamicExpression implements StatementSyntax {
  static fromSpec(node: ComponentSexp, children: Template[]) {
    let [, path, attrs, templateId, inverseId] = node;

    return new Component({
      path: new Ref(path),
      hash: Hash.fromSpec(attrs),
      templates: Templates.fromSpec(templateId, inverseId, children)
    });
  }

  static build(path: string, options: { default: Template, inverse: Template, hash: Hash }): Component {
    return new Component({
      path: Ref.build(path),
      hash: options.hash || null,
      templates: Templates.build(options.default, options.inverse)
    });
  }

  path: Ref;
  hash: Hash;
  templates: Templates;

  constructor(options: { path: Ref, hash: Hash, templates: Templates }) {
    super();
    this.path = options.path;
    this.hash = options.hash;
    this.templates = options.templates;
  }

  prettyPrint() {
    let { path, hash, templates } = this;
    return `Component <${path} ${hash.prettyPrint()} ${templates.prettyPrint()}>`;
  }

  evaluate(stack: ElementStack, frame: Frame): Morph {
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

  append(stack: ElementStack) {
    let { tag, attrs, template } = this;

    stack.openElement(tag);
    attrs.forEach(attr => stack.appendStatement(attr));
    if (!template.isEmpty) stack.appendMorph(FallbackContents, { template });
    stack.closeElement();
  }
}

class FallbackContents extends Morph {
  private template: Template;
  
  init({ template }) {
    this.template = template;
  }

  append() {
    this.template.evaluate(this, this.frame);
  }
}

type TextSexp = [string, string];

export class Text extends StaticExpression implements StaticStatementSyntax {
  static fromSpec(node: TextSexp): Text {
    let [, content] = node;

    return new Text({ content });
  }

  static build(content): Text {
    return new Text({ content });
  }

  private content: string;

  constructor(options: { content: string }) {
    super();
    this.content = options.content;
  }

  prettyPrint() {
    return `Text(${JSON.stringify(this.content)})`;
  }

  evaluate(stack: ElementStack) {
    stack.appendText(this.content);
  }
}

type CommentSexp = [string, string];

export class Comment extends StaticExpression implements StaticStatementSyntax {
  static fromSpec(sexp: CommentSexp): Comment {
    let [, value] = sexp;

    return new Comment({ value });
  }

  static build(value): Comment {
    return new Comment({ value });
  }

  private value: string;

  constructor(options) {
    super();
    this.value = options.value;
  }
  
  prettyPrint() {
    return `Comment <!-- ${this.value} -->`;
  }

  evaluate(stack: ElementStack) {
    stack.appendComment(this.value);
  }
}

type OpenElementSexp = [string, string];

export class OpenElement extends StaticExpression implements StaticStatementSyntax {
  static fromSpec(sexp: OpenElementSexp): OpenElement {
    let [, tag] = sexp;

    return new OpenElement({ tag });
  }

  static build(tag): OpenElement {
    return new OpenElement({ tag });
  }

  private tag: string;

  constructor(options: { tag: string }) {
    super();
    this.tag = options.tag;
  }

  prettyPrint() {
    return `<${this.tag}>`;
  }

  evaluate(stack: ElementStack) {
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

  evaluate(stack: ElementStack) {
    stack.closeElement();
  }
}

type StaticAttrSexp = [string, string, string, string];

export class StaticAttr extends StaticExpression implements AttributeSyntax, StaticStatementSyntax {
  static fromSpec(node: StaticAttrSexp): StaticAttr {
    let [, name, value, namespace] = node;

    return new StaticAttr({ name, value, namespace });
  }

  static build(name, value, namespace=null): StaticAttr {
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

  evaluate(stack: ElementStack) {
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

class EvaluatedHash implements ChainableReference {
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

  private value: boolean | string | number;

  constructor(value) {
    super();
    this.value = value;
  }

  prettyPrint() {
    return JSON.stringify(this.value);
  }

  inner() {
    return this.value;
  }

  evaluate(): ChainableReference {
    return new ConstReference(this.value);
  }
}

type GetSexp = [string, Path];

export class Get implements ExpressionSyntax {
  static fromSpec(sexp: GetSexp): Get {
    let [, parts] = sexp;

    return new Get({ ref: new Ref(parts) });
  }

  static build(path): Get {
    return new Get({ ref: Ref.build(path) });
  }
  
  private ref: Ref;

  constructor(options) {
    this.ref = options.ref;
  }

  prettyPrint() {
    return `Get ${this.ref.prettyPrint()}`;
  }

  evaluate(frame: Frame): ChainableReference {
    return this.ref.evaluate(frame);
  }
}

// intern paths because they will be used as keys
function internPath(path: string): string[] {
  return path.split('.').map(intern);
}

// this is separated out from Get because Unknown also has a ref, but it
// may turn out to be a helper
class Ref implements ExpressionSyntax {
  static build(path: string): Ref {
    return new Ref(internPath(path));
  }

  private parts: string[];

  constructor(parts: string[]) {
    this.parts = parts;
  }

  prettyPrint() {
    return this.parts.join('.');
  }

  evaluate(frame: Frame): ChainableReference {
    let parts = this.parts;
    let path = frame.scope().getBase(parts[0]);

    for (let i = 1; i < parts.length; i++) {
      path = path.get(parts[i]);
    }

    return path;
  }

  path(): string[] {
    return this.parts;
  }

  isHelper(frame: Frame): boolean {
    return frame.hasHelper(this.parts);
  }
}

type HelperSexp = [string, PathSexp, ParamsSexp, HashSexp];

export class Helper implements ExpressionSyntax {
  static fromSpec(sexp: HelperSexp): Helper {
    let [, path, params, hash] = sexp;

    return new Helper({
      path: new Ref(path),
      params: ParamsAndHash.fromSpec(params, hash)
    });
  }

  static build(path: string, params: Params, hash: Hash): Helper {
    return new Helper({ path: Ref.build(path), params: new ParamsAndHash({ params, hash }) });
  }

  path: Ref;
  params: ParamsAndHash;

  constructor(options: { path: Ref, params: ParamsAndHash }) {
    this.path = options.path;
    this.params = options.params;
  }

  evaluate(frame: Frame): ChainableReference {
    let helper = frame.lookupHelper(this.path);
    let { params } = this;
    return HelperInvocationReference.fromStatements({ helper, params, frame });
  }
}

type ConcatSexp = [string, ParamsSexp];

export class Concat implements ExpressionSyntax {
  static fromSpec(sexp: ConcatSexp): Concat {
    let [, params] = sexp;

    return new Concat({ parts: Params.fromSpec(params) });
  }

  static build(parts): Concat {
    return new Concat({ parts });
  }

  parts: Params;

  constructor(options) {
    this.parts = options.parts;
  }

  evaluate(frame: Frame): ChainableReference {
    return new ConcatReference(this.parts.map(p => p.evaluate(frame)));
  }
}

const ExpressionNodes = {
  get: Get,
  helper: Helper,
  concat: Concat
};

export function buildStatements(statements: any[], list: Template[]): StatementSyntax[] {
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

function buildExpression(spec: Spec): PrettyPrintableExpressionSyntax {
  if (typeof spec !== 'object' || spec === null) {
    return Value.fromSpec(spec);
  } else {
    return ExpressionNodes[spec[0]].fromSpec(spec);
  }
}

export class ParamsAndHash implements PrettyPrintableExpressionSyntax {
  static fromSpec(params: ParamsSexp, hash: HashSexp): ParamsAndHash {
    return new ParamsAndHash({ params: Params.fromSpec(params), hash: Hash.fromSpec(hash) });
  }

  static build(params: Params, hash: Hash): ParamsAndHash {
    return new ParamsAndHash({ params, hash });
  }
  
  private params: Params;
  private hash: Hash;

  constructor(options: { params: Params, hash: Hash }) {
    this.params = options.params;
    this.hash = options.hash;
  }

  prettyPrint() {
    return `ParamsAndHash { params=${this.params.prettyPrint()}, hash=${this.hash.prettyPrint()} }`;
  }
  
  evaluate(frame: Frame): ChainableReference {
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
  static fromSpec(sexp: ParamsSexp): Params {
    if (!sexp || sexp.length === 0) return Params.empty();
    return new Params(sexp.map(buildExpression));
  }

  static build(exprs: ExpressionSyntax[]): Params {
    return new Params(exprs);
  }

  static _empty: Params;

  static empty(): Params {
    return (this._empty = this._empty || new Params([]));
  }

  params: PrettyPrintableExpressionSyntax[];

  constructor(exprs) {
    super();
    this.params = exprs;
  }

  forEach(callback: EnumerableCallback<ExpressionSyntax>) {
    this.params.forEach(callback);
  }

  prettyPrint() {
    return `Params [ ${this.params.map(p => p.prettyPrint()).join(', ')} ]`;
  }
  
  evaluate(frame: Frame): ChainableReference {
    throw new Error("TODO: unimplemented evaluate for Params");
  }
}

export class Hash implements PrettyPrintableExpressionSyntax {
  static fromSpec(rawPairs: HashSexp): Hash {
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

  static build(hash: Dict<PrettyPrintableExpressionSyntax>): Hash {
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

  static empty(): Hash {
    return (this._empty = this._empty || new Hash({ keys: EMPTY_ARRAY, values: EMPTY_ARRAY }));
  }

  keys: string[];
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

  evaluate(frame: Frame): ChainableReference {
    let { keys, values } = this;
    let out = new Array(values.length);

    for (let i = 0, l = values.length; i < l; i++) {
      out[i] = values[i].evaluate(frame);
    }

    return new EvaluatedHash({ keys, values: out });
  }
}

class Templates implements ExpressionSyntax {
  static fromSpec(templateId, inverseId, children): Templates {
    return new Templates({
      template: templateId === null ? null : children[templateId],
      inverse: inverseId === null ? null : children[inverseId],
    });
  }

  static build(template: Template, inverse: Template): Templates {
    return new Templates({ template, inverse });
  }

  _default: Template;
  _inverse: Template;

  constructor(options: { template: Template, inverse: Template }) {
    this._default = options.template;
    this._inverse = options.inverse;
  }

  prettyPrint() {
    let { _default, _inverse } = this;
    return `Templates { default=${_default ? _default.position : 'none'}, inverse=${_inverse ? _inverse.position : 'none'} }`;
  }
  
  evaluate(frame: Frame): ChainableReference {
    throw new Error("unimplemented evaluate for ExpressionSyntax");
  }
}

export let builders = {
  value: Value.build,
  hash: Hash.build
};

export class TemplateBuilder {
  private statements: any[];
  
  constructor() {
    this.statements = [];
  }

  template() {
    return Template.fromStatements(this.statements); // jshint ignore:line
  }

  specExpr(spec: any[]): PrettyPrintableExpressionSyntax {
    return buildExpression(spec);
  }

  params(params: Params, hash: Hash): ParamsAndHash {
    return new ParamsAndHash({ params, hash });
  }
  
  openElement(tagName: string): OpenElement {
    return OpenElement.build(tagName);
  }
  
  closeElement(): CloseElement {
    return CloseElement.build();
  }
  
  staticAttr(key: string, value: string): StaticAttr {
    return StaticAttr.build(key, value);
  }
  
  dynamicAttr(key: string, value: PrettyPrintableExpressionSyntax, namespace: string=null): DynamicAttr {
    return DynamicAttr.build(key, value);
  }
  
  inline(path: string, params: ParamsAndHash=null, trust: boolean=false): Inline {
    return Inline.build(path, params, trust)
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