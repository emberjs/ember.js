import { TopLevelOperations, Handler } from './builder';
import { RenderResult } from './render';
import { Frame } from './environment';
import {
  ChainableReference,
  PushPullReference,
  ConstReference
} from 'htmlbars-reference';
import { ElementStack, ClassList } from './builder';
import { Environment, Insertion, Helper as EnvHelper } from './environment';
import { LITERAL, InternedString, Dict, dict, intern, assign } from 'htmlbars-util';

interface Bounds {
  parentNode(): Node;
  firstNode(): Node;
  lastNode(): Node;
}

interface Reference {}

import {
  HelperMorph,
  InsertionMorph,
  // SimpleHelperMorph
} from './morphs/inline';

import { Morph, ContentMorph, TemplateMorph, SimpleTemplateMorph, HasParentNode } from './morph';

import {
  BlockHelperMorph
} from "./morphs/block";

import { AttrMorph, SetPropertyMorph } from "./morphs/attrs";

type Spec = any[];

const EMPTY_ARRAY = Object.freeze([]);

interface TemplateOptions {
  meta?: Object;
  root?: Template[];
  position?: number;
  locals?: InternedString[];
  statements?: StatementSyntax[];
  spec?: any;
  isEmpty?: boolean;
}

interface RenderOptions {
  hostOptions?: Object,
  appendTo: Element
}

interface EvaluateOptions {
  nextSibling?: Node
}

export default class Template {
  static fromSpec(specs: any): Template {
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

  static fromStatements(statements: StatementSyntax[]): Template {
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
  locals: InternedString[];
  spec: any[];
  isEmpty: boolean;

  constructor({ meta, root, position, locals, statements, spec, isEmpty }: TemplateOptions) {
    this.meta = meta || {};
    this.root = root || null;
    this.position = position === undefined ? null : position;
    this.arity = locals ? locals.length : 0;
    this.statements = statements || EMPTY_ARRAY;
    this.locals = locals || EMPTY_ARRAY;
    this.spec = spec || null;
    this.isEmpty = isEmpty === true ? isEmpty : statements.length === 0;
    Object.seal(this);
  }

  clone(): Template {
    let { meta, root, position, arity, statements, locals, spec, isEmpty } = this;
    statements = statements.slice();
    return new Template({ meta, root, position, statements, locals, spec, isEmpty });
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

  private evaluateWithStack(stack: ElementStack, frame: Frame) {
    TemplateEvaluation.evaluate(this, stack, frame);

    let morphs = stack.morphList();
    let bounds = stack.bounds();
    let scope = frame.scope();

    return new RenderResult({ morphs, scope, bounds, template: this });
  }

  process(stack: ElementStack, frame: Frame) {
    TemplateEvaluation.evaluate(this, stack, frame);
  }

  evaluate(morph: ContentMorph, options: { nextSibling?: Node, handler?: Handler }=null): RenderResult {
    let nextSibling = options && options.nextSibling;
    let handler = options && options.handler;

    let frame = morph.frame;

    let stack = new ElementStack({ parentNode: morph.parentNode, nextSibling, dom: frame.dom() });
    if (handler) stack.addTopLevelHandler(handler);

    return this.evaluateWithStack(stack, morph.frame);
  }

  render(self: any, env: Environment<any>, options: RenderOptions, blockArguments: any[]=null) {
    let scope = env
      .createRootScope()
      .initTopLevel(self, this.locals, blockArguments, options.hostOptions);

    if (options.hostOptions) {
      scope.bindHostOptions(options.hostOptions);
    }

    let frame = env.pushFrame(scope);

    let rootMorph = new RootMorph(options.appendTo, frame);

    return this.evaluate(rootMorph, null);
  }
}

export class TemplateEvaluation {
  static evaluate(template: Template, stack: ElementStack, frame: Frame) {
    let evaluation = new TemplateEvaluation(template);
    evaluation.evaluate(stack, frame);
  }

  private template: Template;
  private position: number = 0;

  constructor(template: Template) {
    this.template = template;
  }

  evaluate(stack: ElementStack, frame: Frame) {
    let statements = this.template.statements;
    for (let l=statements.length; this.position<l;) {
      let i = this.position++;
      stack.appendStatement(statements[i], frame, this);
    }
  }

  takeHash(): AttributeSyntax[] {
    let syntax = [];

    let { template: { statements }, position } = this;
    let element = statements[position];

    while (true) {
      if (!element[ATTRIBUTE_SYNTAX]) break;
      syntax.push(element);
      element = statements[++position];
    }

    this.position = position;
    return syntax;
  }

  takeBlock(): StatementSyntax[] {
    let syntax = [];
    let nesting = 1;

    let { template: { statements }, position } = this;
    let element = statements[position];

    while (true) {
      if (element.type === 'open-element') nesting++;
      else if (element.type === 'close-element') nesting--;

      if (nesting === 0) break;
      syntax.push(element);
      element = statements[++position];
    }

    this.position = position;
    return syntax;
  }
}

class RootMorph extends ContentMorph {
  // TODO: Yick
  firstNode() { return null; }
  lastNode() { return null; }

  init(ignored: Object) {}
  append() {}
  update() {}
  destroy() {}
}

type PrettyPrintValue = PrettyPrint | string;

class PrettyPrint {
  type: string;
  operation: string;
  params: PrettyPrintValue[];
  hash: Dict<PrettyPrintValue>;
  templates: Dict<number>;

  constructor(type: string, operation: string, params: PrettyPrintValue[]=null, hash: Dict<PrettyPrintValue>=null, templates: Dict<number>=null) {
    this.type = type;
    this.operation = operation;
    this.params = params;
    this.hash = hash;
    this.templates = templates;
  }
}

interface PrettyPrintable {
  prettyPrint(): PrettyPrint;
}

export interface ExpressionSyntax {
  type: string;
  isStatic: boolean;
  evaluate(frame: Frame): ChainableReference;
  prettyPrint(): any;
}

export interface StatementSyntax {
  evaluate(stack: ElementStack, frame?, evaluation?): any;
  type: string;
  isStatic: boolean;
}

export interface StaticStatementSyntax extends StatementSyntax, PrettyPrintable {
  evaluate(stack: ElementStack, frame: Frame, evaluation: TemplateEvaluation): void;
}

export interface DynamicStatementSyntax extends StatementSyntax {
  evaluate(stack: ElementStack, frame: Frame, evaluation: TemplateEvaluation): Morph;
}

abstract class StaticExpression {
  isStatic: boolean = true;
}

abstract class DynamicExpression {
  isStatic: boolean = false;
}

type PathSexp = InternedString[];
type ExpressionSexp = any[];
type ParamsSexp = ExpressionSexp[];
type HashSexp = any[];

type BlockSexp = [InternedString, PathSexp, ParamsSexp, HashSexp, number, number];

export interface BlockOptions {

}

export class Block extends DynamicExpression implements DynamicStatementSyntax, PrettyPrintable {
  public type = "block";

  static fromSpec(sexp: BlockSexp, children: Template[]): Block {
    let [, path, params, hash, templateId, inverseId] = sexp;

    return new Block({
      path,
      args: ParamsAndHash.fromSpec(params, hash),
      templates: Templates.fromSpec(templateId, inverseId, children)
    });
  }

  static build(options): Block {
    return new this(options);
  }

  path: InternedString[];
  args: ParamsAndHash;
  templates: Templates;

  constructor(options: { path: InternedString[], args: ParamsAndHash, templates: Templates }) {
    super();
    this.path = options.path;
    this.args = options.args;
    this.templates = options.templates;
  }

  prettyPrint() {
    let [params, hash] = this.args.prettyPrint();
    let block = new PrettyPrint('expr', this.path.join('.'), params, hash);
    return new PrettyPrint('block', 'block', [block], null, this.templates.prettyPrint());
  }

  evaluate(stack: ElementStack, frame: Frame): BlockHelperMorph {
    let helper = frame.lookupHelper(this.path);
    let args = this.args.evaluate(frame);
    let templates = this.templates;

    return stack.createContentMorph(BlockHelperMorph, { helper, args, templates }, frame);
  }
}

type UnknownSexp = [string, PathSexp, boolean];

export class Unknown extends DynamicExpression implements ExpressionSyntax {
  public type = "unknown";

  static fromSpec(sexp: UnknownSexp): Unknown {
    let [, path, unsafe] = sexp;

    return new Unknown({ ref: new Ref(path), unsafe });
  }

  static build(path: string, unsafe: boolean): Unknown {
    return new this({ ref: Ref.build(path), unsafe });
  }

  ref: Ref;
  trustingMorph: boolean;

  constructor(options) {
    super();
    this.ref = options.ref;
    this.trustingMorph = !!options.unsafe;
  }

  prettyPrint() {
    return new PrettyPrint('expr', 'unknown', [this.ref.prettyPrint()], null);
  }

  evaluate(frame: Frame): ChainableReference {
    let { ref, trustingMorph } = this;

    let content;

    if (ref.isHelper(frame)) {
      let path = frame.lookupHelper(ref.path());
      return new HelperInvocationReference(path, EvaluatedParamsAndHash.empty());
    } else {
      return ref.evaluate(frame);
    }
  }

  simplePath(): InternedString {
    return this.ref.simplePath();
  }
}

type AppendSexp = [InternedString, ExpressionSexp, boolean];

export class Append extends DynamicExpression implements DynamicStatementSyntax {
  public type = "append";

  static fromSpec(sexp: AppendSexp) {
    let [, value, trustingMorph] = sexp;

    return new Append({ value: buildExpression(value), trustingMorph });
  }

  static build(value: ExpressionSyntax, trustingMorph: boolean) {
    return new this({ value, trustingMorph });
  }

  value: ExpressionSyntax;
  trustingMorph: boolean;

  constructor({ value, trustingMorph }: { value: ExpressionSyntax, trustingMorph: boolean }) {
    super();
    this.value = value;
    this.trustingMorph = trustingMorph;
  }

  prettyPrint() {
    let operation = this.trustingMorph ? 'html' : 'text';
    return new PrettyPrint('append', operation, [this.value.prettyPrint()]);
  }

  evaluate(stack: ElementStack, frame: Frame): Morph {
    let content = this.value.evaluate(frame);
    let trustingMorph = this.trustingMorph;

    return stack.createContentMorph(HelperMorph, { content, trustingMorph }, frame);
  }
}

class HelperInvocationReference extends PushPullReference {
  private helper: ConstReference<EnvHelper>;
  private args: ChainableReference;

  constructor(helper: ConstReference<EnvHelper>, args: EvaluatedParamsAndHash) {
    super();
    this.helper = this._addSource(helper);
    this.args = this._addSource(args);
  }

  value(): Insertion {
    let { helper, args }  = this;
    let { params, hash } = args.value();
    return this.helper.value()(params, hash, null);
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

export const ATTRIBUTE_SYNTAX = "e1185d30-7cac-4b12-b26a-35327d905d92";

export interface AttributeSyntax extends StatementSyntax {
  "e1185d30-7cac-4b12-b26a-35327d905d92": boolean;
  name: string;
  namespace?: string;
  valueSyntax(): ExpressionSyntax;
  asEvaluated(frame: Frame): AttributeSyntax;
}

type DynamicPropSexp = [string, string, ExpressionSexp, string];

export class DynamicProp extends DynamicExpression implements AttributeSyntax, DynamicStatementSyntax {
  "e1185d30-7cac-4b12-b26a-35327d905d92" = true;
  type = "dynamic-prop";

  static fromSpec(sexp: DynamicPropSexp): DynamicProp {
    let [, name, value, namespace] = sexp;

    return new DynamicProp({
      name,
      value: buildExpression(value)
    });
  }

  static build(name: string, value: any): DynamicProp {
    return new this({ name, value });
  }

  public name: string;
  public value: ExpressionSyntax;

  constructor(options: { name: string, value: ExpressionSyntax }) {
    super();
    this.name = options.name;
    this.value = options.value;
  }

  prettyPrint() {
    let { name, value } = this;

    return new PrettyPrint('attr', 'prop', [name, value.prettyPrint()]);
  }

  valueSyntax(): ExpressionSyntax {
    return this.value;
  }

  asEvaluated(frame: Frame): DynamicProp {
    let { name, value: _value } = this;
    let value = new EvaluatedRef(_value.evaluate(frame));
    return new DynamicProp({ name, value });
  }

  evaluate(stack: ElementStack, frame: Frame): Morph {
    let { name, value: _value } = this;
    let value = _value.evaluate(frame);
    return stack.createMorph(SetPropertyMorph, { name, value }, frame);
  }
}

type DynamicAttrSexp = [InternedString, InternedString, ExpressionSexp, InternedString];

export class DynamicAttr extends DynamicExpression implements AttributeSyntax {
  "e1185d30-7cac-4b12-b26a-35327d905d92" = true;
  type = "dynamic-attr";

  static fromSpec(sexp: DynamicAttrSexp): DynamicAttr {
    let [, name, value, namespace] = sexp;

    return new DynamicAttr({
      name,
      namespace,
      value: buildExpression(value)
    });
  }

  static build(_name: string, value: ExpressionSyntax, _namespace: string=null): DynamicAttr {
    let name = intern(_name);
    let namespace = _namespace ? intern(_namespace) : null;
    return new this({ name, value, namespace });
  }

  name: InternedString;
  value: ExpressionSyntax & PrettyPrintable;
  namespace: InternedString;

  constructor(options: { name: InternedString, value: ExpressionSyntax, namespace: InternedString }) {
    super();
    this.name = options.name;
    this.value = options.value;
    this.namespace = options.namespace;
  }

  prettyPrint() {
    let { name, value, namespace } = this;

    if (namespace) {
      return new PrettyPrint('attr', 'attr', [name, value.prettyPrint()], { namespace });
    } else {
      return new PrettyPrint('attr', 'attr', [name, value.prettyPrint()]);
    }
  }

  valueSyntax(): ExpressionSyntax {
    return this.value;
  }

  asEvaluated(frame: Frame): DynamicProp {
    let { name, value: _value, namespace } = this;
    let value = new EvaluatedRef(_value.evaluate(frame));
    return new DynamicAttr({ name, value, namespace });
  }

  evaluate(stack: ElementStack, frame: Frame): AttrMorph {
    let { name, value: _value, namespace } = this;
    let value = _value.evaluate(frame);
    return stack.createMorph(AttrMorph, { name, value, namespace }, frame);
  }
}

type AddClassSexpr = [InternedString, ExpressionSexp];

export class AddClass extends StaticExpression implements AttributeSyntax, PrettyPrintable {
  "e1185d30-7cac-4b12-b26a-35327d905d92" = true;
  type = "add-class";

  static fromSpec(node: AddClassSexpr): AddClass {
    let [, value] = node;

    return new AddClass({ value: buildExpression(value) });
  }

  static build(value: ExpressionSyntax): AddClass {
    return new this({ value });
  }

  public name = "class";
  public value: ExpressionSyntax;

  constructor({ value }: { value: ExpressionSyntax }) {
    super();
    this.value = value;
  }

  prettyPrint(): PrettyPrint {
    return new PrettyPrint('attr', 'attr', ['class', this.value.prettyPrint()]);
  }

  valueSyntax(): ExpressionSyntax {
    return this.value;
  }

  asEvaluated(frame: Frame): DynamicProp {
    let { value: _value } = this;
    let value = new EvaluatedRef(_value.evaluate(frame));
    return new AddClass({ value });
  }

  evaluate(stack: ElementStack, frame: Frame): any {
    stack.addClass(this.value.evaluate(frame));
  }
}

export class CloseElement extends DynamicExpression implements DynamicStatementSyntax {
  type = "close-element";

  static fromSpec() {
    return new CloseElement();
  }

  static build() {
    return new this();
  }

  prettyPrint() {
    return new PrettyPrint('element', 'close-element');
  }

  evaluate(stack: ElementStack, frame: Frame): Morph {
    let { element, classList } = stack.closeElement();
    return stack.createMorph(CloseElementMorph, { element, classList }, frame)
  }
}

type TextSexp = [string, string];

export class Text extends StaticExpression implements StaticStatementSyntax {
  type = "text";

  static fromSpec(node: TextSexp): Text {
    let [, content] = node;

    return new Text({ content });
  }

  static build(content): Text {
    return new this({ content });
  }

  private content: string;

  constructor(options: { content: string }) {
    super();
    this.content = options.content;
  }

  prettyPrint() {
    return new PrettyPrint('append', 'text', [this.content]);
  }

  evaluate(stack: ElementStack) {
    stack.appendText(this.content);
  }
}

type CommentSexp = [string, string];

export class Comment extends StaticExpression implements StaticStatementSyntax {
  type = "comment";

  static fromSpec(sexp: CommentSexp): Comment {
    let [, value] = sexp;

    return new Comment({ value });
  }

  static build(value): Comment {
    return new this({ value });
  }

  private value: string;

  constructor(options) {
    super();
    this.value = options.value;
  }

  prettyPrint() {
    return new PrettyPrint('append', 'append-comment', [this.value]);
  }

  evaluate(stack: ElementStack) {
    stack.appendComment(this.value);
  }
}

type OpenElementSexp = [InternedString, InternedString, InternedString[]];

export class OpenElement extends StaticExpression implements StaticStatementSyntax {
  type = "open-element";

  static fromSpec(sexp: OpenElementSexp): OpenElement {
    let [, tag, blockParams] = sexp;

    return new OpenElement({ tag, blockParams });
  }

  static build(tag: string, blockParams: string[]): OpenElement {
    return new this({ tag: intern(tag), blockParams: blockParams && blockParams.map(intern) });
  }

  public tag: InternedString;
  public blockParams: InternedString[]

  constructor(options: { tag: InternedString, blockParams: InternedString[] }) {
    super();
    this.tag = options.tag;
    this.blockParams = options.blockParams;
  }

  prettyPrint() {
    let params = new PrettyPrint('block-params', 'as', this.blockParams);
    return new PrettyPrint('element', 'open-element', [this.tag, params]);
  }

  toIdentity(): OpenPrimitiveElement {
    let { tag } = this;
    return new OpenPrimitiveElement({ tag });
  }

  evaluate(stack: ElementStack, frame: Frame, evaluation: TemplateEvaluation) {
    let { tag } = this;

    let def = frame.getComponentDefinition([tag], this);
    if (def) {
      let hashSyntax = evaluation.takeHash();
      let hash = attrListToHash(hashSyntax).evaluate(frame);
      let template = new Template({ statements: evaluation.takeBlock(), locals: this.blockParams });
      let templates = Templates.build(template, null, Template.fromStatements(hashSyntax));

      stack.openComponent(def, { tag, frame, templates, hash });
    } else {
      stack.openElement(tag);
    }
  }
}

export class OpenPrimitiveElement extends StaticExpression implements StaticStatementSyntax {
  type = "open-primitive-element";

  private tag: InternedString;

  static build(tag: string): OpenPrimitiveElement {
    return new this({ tag: intern(tag) });
  }

  constructor(options: { tag: InternedString }) {
    super();
    this.tag = options.tag;
  }

  prettyPrint() {
    return new PrettyPrint('element', 'open-element', [this.tag]);
  }

  evaluate(stack: ElementStack, frame: Frame, evaluation: TemplateEvaluation) {
    stack.openElement(this.tag);
  }
}

export function attrListToHash(attrs: AttributeSyntax[]): Hash {
  let d = attrs.reduce((d, attr) => {
    d[attr.name] = attr.valueSyntax();
    return d;
  }, dict<ExpressionSyntax>());

  return Hash.build(d);
}

interface CloseElementOptions {
  element: Element;
  classList: ClassList;
}

export class CloseElementMorph extends Morph {
  private element: Element;
  private classList: ClassList;
  private lastValue: string = null;

  static specialize({ element, classList }: CloseElementOptions): typeof CloseElementMorph {
    if (!classList) return NoopMorph;
    else return CloseElementMorph;
  }

  init({ element, classList }: { element: Element, classList: ClassList }) {
    this.element = element;
    this.classList = classList;
  }

  append(stack: ElementStack) {
    let val = this.lastValue = this.classList.value();

    if (val !== null) {
      this.frame.dom().setAttribute(this.element, 'class', val);
    }
  }

  update() {
    let lastVal = this.lastValue;
    let val = this.lastValue = this.classList.value();

    if (lastVal !== val && val !== null) {
      this.frame.dom().setAttribute(this.element, 'class', this.classList.value());
    }
  }
}

class NoopMorph extends CloseElementMorph {
  init() {}
  append() {}
  update() {}
}

type StaticAttrSexp = [InternedString, InternedString, InternedString, InternedString];

export class StaticAttr extends StaticExpression implements AttributeSyntax, StaticStatementSyntax {
  "e1185d30-7cac-4b12-b26a-35327d905d92" = true;
  type = "static-attr";

  static fromSpec(node: StaticAttrSexp): StaticAttr {
    let [, name, value, namespace] = node;

    return new StaticAttr({ name, value, namespace });
  }

  static build(name: string, value: string, namespace: string=null): StaticAttr {
    return new this({ name: intern(name), value: intern(value), namespace: namespace && intern(namespace) });
  }

  name: InternedString;
  value: InternedString;
  namespace: InternedString;

  constructor(options) {
    super();
    this.name = options.name;
    this.value = options.value;
    this.namespace = options.namespace;
  }

  prettyPrint() {
    let { name, value, namespace } = this;

    if (namespace) {
      return new PrettyPrint('attr', 'attr', [name, value], { namespace });
    } else {
      return new PrettyPrint('attr', 'attr', [name, value]);
    }
  }

  valueSyntax(): ExpressionSyntax {
    return Value.build(this.value);
  }

  asEvaluated(frame: Frame): StaticAttr {
    return this;
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
  append: Append,
  //modifier: Modifier,
  dynamicAttr: DynamicAttr,
  dynamicProp: DynamicProp,
  addClass: AddClass,

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

export class Value extends StaticExpression implements ExpressionSyntax {
  type = "value";

  static fromSpec(value): Value {
    return new Value(value);
  }

  static build(value) {
    return new this(value);
  }

  private value: boolean | string | number;

  constructor(value) {
    super();
    this.value = value;
  }

  prettyPrint() {
    return this.value;
  }

  inner() {
    return this.value;
  }

  evaluate(): ChainableReference {
    return new ConstReference(this.value);
  }
}

type Path = InternedString[];
type GetSexp = [InternedString, Path];

export class Get extends DynamicExpression implements ExpressionSyntax, PrettyPrintable {
  type = "get";

  static fromSpec(sexp: GetSexp): Get {
    let [, parts] = sexp;

    return new Get({ ref: new Ref(parts) });
  }

  static build(path: string): Get {
    return new this({ ref: Ref.build(path) });
  }

  private ref: Ref;

  constructor(options) {
    super();
    this.ref = options.ref;
  }

  prettyPrint() {
    return new PrettyPrint('expr', 'get', [this.ref.prettyPrint()], null);
  }

  evaluate(frame: Frame): ChainableReference {
    return this.ref.evaluate(frame);
  }
}

// intern paths because they will be used as keys
function internPath(path: string): InternedString[] {
  return path.split('.').map(intern);
}

// this is separated out from Get because Unknown also has a ref, but it
// may turn out to be a helper
class Ref extends DynamicExpression implements ExpressionSyntax {
  type = "ref";

  static build(path: string): Ref {
    return new this(internPath(path));
  }

  private parts: InternedString[];

  constructor(parts: InternedString[]) {
    super();
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

  path(): InternedString[] {
    return this.parts;
  }

  simplePath(): InternedString {
    if (this.parts.length === 1) {
      return this.parts[0];
    }
  }

  isHelper(frame: Frame): boolean {
    return frame.hasHelper(this.parts);
  }
}

export class EvaluatedRef implements ExpressionSyntax {
  public type = "evaluated-ref";
  private ref: ChainableReference;
  public isStatic = false;

  constructor(ref: ChainableReference) {
    this.ref = ref;
  }

  prettyPrint(): any {
    return this.ref.value();
  }

  evaluate(): ChainableReference {
    return this.ref;
  }
}

type HelperSexp = [string, PathSexp, ParamsSexp, HashSexp];

export class Helper implements ExpressionSyntax {
  type = "helper";

  static fromSpec(sexp: HelperSexp): Helper {
    let [, path, params, hash] = sexp;

    return new Helper({
      ref: new Ref(path),
      args: ParamsAndHash.fromSpec(params, hash)
    });
  }

  static build(path: string, params: Params, hash: Hash): Helper {
    return new this({ ref: Ref.build(path), args: new ParamsAndHash({ params, hash }) });
  }

  isStatic = false;
  ref: Ref;
  args: ParamsAndHash;

  constructor(options: { ref: Ref, args: ParamsAndHash }) {
    this.ref = options.ref;
    this.args = options.args;
  }

  prettyPrint() {
    let [params, hash] = this.args.prettyPrint();
    return new PrettyPrint('expr', this.ref.prettyPrint(), params, hash);
  }

  evaluate(frame: Frame): ChainableReference {
    let helper = frame.lookupHelper(this.ref.path());
    return new HelperInvocationReference(helper, this.args.evaluate(frame));
  }

  simplePath(): InternedString {
    return this.ref.simplePath();
  }
}

type ConcatSexp = [string, ParamsSexp];

export class Concat implements ExpressionSyntax {
  type = "concat";

  static fromSpec(sexp: ConcatSexp): Concat {
    let [, params] = sexp;

    return new Concat({ parts: Params.fromSpec(params) });
  }

  static build(parts): Concat {
    return new this({ parts });
  }

  isStatic = false;
  parts: Params;

  constructor(options) {
    this.parts = options.parts;
  }

  prettyPrint() {
    return new PrettyPrint('expr', 'concat', this.parts.map(p => p.prettyPrint()));
  }

  evaluate(frame: Frame): ChainableReference {
    return new ConcatReference(this.parts.map(p => p.evaluate(frame)));
  }
}

class ConcatReference extends PushPullReference {
  private parts: ChainableReference[];

  constructor(parts: ChainableReference[]) {
    super();
    this.parts = parts;
    parts.forEach(part => {
      part.chain(this);
    })
  }

  value() {
    return this.parts.map(p => p.value()).join('');
  }
}

const ExpressionNodes = {
  get: Get,
  unknown: Unknown,
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

function buildExpression(spec: Spec): ExpressionSyntax {
  if (typeof spec !== 'object' || spec === null) {
    return Value.fromSpec(spec);
  } else {
    return ExpressionNodes[spec[0]].fromSpec(spec);
  }
}

export class ParamsAndHash implements ExpressionSyntax {
  public type = "params-and-hash";

  static fromSpec(params: ParamsSexp, hash: HashSexp): ParamsAndHash {
    return new ParamsAndHash({ params: Params.fromSpec(params), hash: Hash.fromSpec(hash) });
  }

  static _empty: ParamsAndHash;

  static empty(): ParamsAndHash {
    return (this._empty = this._empty || new ParamsAndHash({ params: Params.empty(), hash: Hash.empty() }));
  }

  static build(params: Params, hash: Hash): ParamsAndHash {
    return new this({ params, hash });
  }

  public params: Params;
  public hash: Hash;
  public isStatic = false;

  constructor(options: { params: Params, hash: Hash }) {
    this.params = options.params;
    this.hash = options.hash;
  }

  prettyPrint(): [PrettyPrintValue[], Dict<PrettyPrintValue>] {
    return [this.params.prettyPrint(), this.hash.prettyPrint()];
  }

  evaluate(frame: Frame): EvaluatedParamsAndHash {
    return new EvaluatedParamsAndHash(this, frame);
  }
}

export class EvaluatedParamsAndHash extends PushPullReference {
  static _empty: EvaluatedParamsAndHash;

  static empty(): EvaluatedParamsAndHash {
    return (this._empty = this._empty || ParamsAndHash.empty().evaluate(null));
  }

  public params: EvaluatedParams;
  public hash: EvaluatedHash;

  constructor({ params, hash }: ParamsAndHash, frame: Frame) {
    super();
    this.params = this._addSource(params.evaluate(frame));
    this.hash = hash.evaluate(frame);
  }

  value(): { params: any[], hash: Dict<any> } {
    return { params: this.params.value(), hash: this.hash.value() };
  }
}

interface EnumerableCallback<T> {
  (value: T): void;
}

class Enumerable<T> {
  forEach(callback: EnumerableCallback<T>) {
    throw new Error(`unimplemented forEach for ${this.constructor.name}`);
  }

  map<U>(callback: (T) => U): U[] {
    let out = [];
    this.forEach(val => out.push(callback(val)));
    return out;
  }
}

export class Params extends Enumerable<ExpressionSyntax> implements ExpressionSyntax {
  public type = "params";

  static fromSpec(sexp: ParamsSexp): Params {
    if (!sexp || sexp.length === 0) return Params.empty();
    return new Params(sexp.map(buildExpression));
  }

  static build(exprs: ExpressionSyntax[]): Params {
    return new this(exprs);
  }

  static _empty: Params;

  static empty(): Params {
    return (this._empty = this._empty || new Params([]));
  }

  params: ExpressionSyntax[];
  length: number;
  isStatic = false;

  constructor(exprs: ExpressionSyntax[]) {
    super();
    this.params = exprs;
    this.length = exprs.length;
  }

  forEach(callback: EnumerableCallback<ExpressionSyntax>) {
    this.params.forEach(callback);
  }

  push(expr: ExpressionSyntax) {
    this.params.push(expr);
    this.length = this.params.length;
  }

  at(index: number): ExpressionSyntax {
    return this.params[index];
  }

  prettyPrint(): PrettyPrintValue[] {
    return this.params.map(p => p.prettyPrint());
  }

  evaluate(frame: Frame): EvaluatedParams {
    return new EvaluatedParams(this, frame);
  }
}

export class EvaluatedParams extends PushPullReference {
  public references: ChainableReference[];

  constructor(params: Params, frame: Frame) {
    super();

    this.references = params.map(param => {
      let result = param.evaluate(frame);
      this._addSource(result);
      return result;
    })
  }

  nth(n: number) {
    return this.references[n];
  }

  first() {
    return this.nth(0);
  }

  last() {
    return this.nth(this.references.length - 1);
  }

  value() {
    return this.references.map(p => p.value());
  }
}

export class Hash implements ExpressionSyntax {
  public type = "hash";

  static fromSpec(rawPairs: HashSexp): Hash {
    if (!rawPairs) { return Hash.empty(); }

    let keys = [];
    let values = [];
    let map = dict<ExpressionSyntax>();

    for (let i = 0, l = rawPairs.length; i < l; i += 2) {
      let key = rawPairs[i];
      let expr = rawPairs[i+1];
      keys.push(key);
      let value = buildExpression(expr);
      values.push(value);
      map[key] = value;
    }

    return new Hash({ keys, values, map });
  }

  static build(map: Dict<ExpressionSyntax>): Hash {
    if (map === undefined) { return Hash.empty(); }
    let keys = [];
    let values = [];

    Object.keys(map).forEach(key => {
      keys.push(key);
      values.push(map[key]);
    });

    return new this({ keys, values, map });
  }

  static _empty;

  static empty(): Hash {
    return (this._empty = this._empty || new Hash({ keys: EMPTY_ARRAY, values: EMPTY_ARRAY, map: dict<ExpressionSyntax>() }));
  }

  public map: Dict<ExpressionSyntax>;
  public keys: InternedString[];
  public values: ExpressionSyntax[];
  public isStatic = false;

  constructor({ keys, values, map }: { keys: InternedString[], values: ExpressionSyntax[], map: Dict<ExpressionSyntax> }) {
    this.keys = keys;
    this.values = values;
    this.map = map;
  }

  prettyPrint(): Dict<PrettyPrintValue> {
    let out = dict<PrettyPrintValue>();
    this.keys.forEach((key, i) => {
      out[<string>key] = this.values[i].prettyPrint();
    })
    return out;
  }

  clone(): Hash {
    let { keys, values, map } = this;

    keys = keys.slice();
    values = values.slice();
    map = assign(dict<ExpressionSyntax>(), map);

    return new Hash({ keys, values, map });
  }

  add(key: InternedString, value: ExpressionSyntax) {
    this.keys.push(key);
    this.values.push(value);
    this.map[<string>key] = value;
  }

  at(key: InternedString): ExpressionSyntax {
    return this.map[<string>key];
  }

  has(key: InternedString): boolean {
    return !!this.map[<string>key];
  }

  evaluate(frame: Frame): EvaluatedHash {
    return new EvaluatedHash(this, frame);
  }
}

export class EvaluatedHash extends PushPullReference {
  public values: ChainableReference[];
  public keys: InternedString[];
  public map: Dict<ChainableReference>;

  constructor(hash: Hash, frame: Frame) {
    super();

    let { keys, values } = hash;
    let map = dict<ChainableReference>();

    this.values = values.map((value, i) => {
      let result = value.evaluate(frame);
      map[<string>keys[i]] = result;
      this._addSource(result);
      return result;
    });

    this.map = map;
    this.keys = hash.keys;
  }

  forEach(callback: (key: InternedString, value: ChainableReference) => void) {
    let values = this.values;
    this.keys.forEach((key, i) => callback(key, this.values[i]));
  }

  at(key: InternedString): ChainableReference {
    return this.map[<string>key];
  }

  value(): Dict<any> {
    let hash = dict();
    let refs = this.values;

    this.keys.forEach((k, i) => {
      hash[<string>k] = refs[i].value();
    });

    return hash;
  }
}

export class Templates implements ExpressionSyntax {
  public type = "templates";

  static fromSpec(templateId, inverseId, children): Templates {
    return new Templates({
      template: templateId === null ? null : children[templateId],
      inverse: inverseId === null ? null : children[inverseId],
      attributes: null
    });
  }

  static build(template: Template, inverse: Template=null, attributes: Template=null): Templates {
    return new this({ template, inverse, attributes });
  }

  public isStatic = false;
  public default: Template;
  public inverse: Template;
  public attributes: Template;

  constructor(options: { template: Template, inverse: Template, attributes: Template }) {
    this.default = options.template;
    this.inverse = options.inverse;
    this.attributes = options.attributes;
  }

  prettyPrint(): Dict<number> {
    let { default: _default, inverse } = this;

    return {
      default: _default && _default.position,
      inverse: inverse && inverse.position
    }
  }

  evaluate(frame: Frame): ChainableReference {
    throw new Error("unimplemented evaluate for ExpressionSyntax");
  }
}

export let builders = {
  value: bind(Value.build, Value),
  hash: bind(Hash.build, Hash),
  openElement: bind(OpenElement.build, OpenElement),
  openPrimitiveElement: bind(OpenPrimitiveElement.build, OpenPrimitiveElement),
  closeElement: bind(CloseElement.build, CloseElement),
  staticAttr: bind(StaticAttr.build, StaticAttr),
  dynamicAttr: bind(DynamicAttr.build, DynamicAttr),
  addClass: bind(AddClass.build, AddClass)
};

function bind<T extends Function>(f: T, self: any): T {
  return f.bind(self);
}

export class TemplateBuilder {
  private statements: any[];

  constructor() {
    this.statements = [];
  }

  template() {
    return Template.fromStatements(this.statements);
  }

  specExpr(spec: any[]): ExpressionSyntax {
    return buildExpression(spec);
  }

  params(params: Params, hash: Hash): ParamsAndHash {
    return new ParamsAndHash({ params, hash });
  }

  openElement(tagName: string): OpenElement {
    return OpenElement.build(tagName, null);
  }

  closeElement(): CloseElement {
    return CloseElement.build();
  }

  staticAttr(key: string, value: string): StaticAttr {
    return StaticAttr.build(key, value);
  }

  dynamicAttr(key: string, value: ExpressionSyntax, namespace: string=null): DynamicAttr {
    return DynamicAttr.build(key, value);
  }

  append(expression: ExpressionSyntax, trust: boolean=false): Append {
    return Append.build(expression, trust);
  }
}

// export all statement nodes as builders via their static `build` method
Object.keys(StatementNodes).forEach(key => {
  let builderKey = `${key[0].toLowerCase()}${key.slice(1)}`;
  builders[builderKey] = StatementNodes[key].build.bind(StatementNodes[key]);
});

Object.keys(builders).forEach(key => {
  TemplateBuilder.prototype[key] = function(...args) {
    this.statements.push(builders[key](...args));
  };
});