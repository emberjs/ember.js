import { RenderResult } from './render';
import { Frame } from './environment';
import { VM } from './vm';

import {
  StatementSyntax,
  DynamicStatementSyntax,
  StaticStatementSyntax,
  StaticExpression,
  DynamicExpression,
  ExpressionSyntax,
  PrettyPrint,
  PrettyPrintable,
  PrettyPrintValue
} from './opcodes';

import {
  ChainableReference,
  PushPullReference,
  ConstReference
} from 'htmlbars-reference';
import { ElementStack, ClassList } from './builder';
import { Environment, Insertion, Helper as EnvHelper } from './environment';
import { LinkedList, LinkedListNode, LITERAL, InternedString, Dict, dict, intern, assign } from 'htmlbars-util';

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

import { Morph, ContentMorph, TemplateMorph, BlockInvocationMorph, SimpleTemplateMorph, HasParentNode } from './morph';

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
  statements?: LinkedList<StatementSyntax>;
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

  static fromList(statements: LinkedList<StatementSyntax>): Template {
    return new Template({
      statements,
      root: null,
      position: null,
      meta: null,
      locals: null,
      isEmpty: statements.isEmpty(),
      spec: null
    });
  }

  static fromStatements(statements: StatementSyntax[]): Template {
    let list = new LinkedList<StatementSyntax>();
    statements.forEach(s => list.append(s));

    return new Template({
      statements: list,
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
  locals: InternedString[];
  spec: any[];
  isEmpty: boolean;
  statements: LinkedList<StatementSyntax>

  constructor({ meta, root, position, locals, statements, spec, isEmpty }: TemplateOptions) {
    this.meta = meta || {};
    this.root = root || null;
    this.position = position === undefined ? null : position;
    this.arity = locals ? locals.length : 0;
    this.statements = statements || new LinkedList<StatementSyntax>();
    this.locals = locals || EMPTY_ARRAY;
    this.spec = spec || null;
    this.isEmpty = isEmpty === true ? isEmpty : statements.isEmpty();
    Object.seal(this);
  }

  clone(): Template {
    let { meta, root, position, arity, statements, locals, spec, isEmpty } = this;
    statements = statements.clone(node => node.clone());
    return new Template({ meta, root, position, statements, locals, spec, isEmpty });
  }

  prettyPrint() {
    function pretty(obj) {
      if (typeof obj.prettyPrint === 'function') return obj.prettyPrint();
      else throw new Error(`Cannot pretty print ${obj.constructor.name}`);
    }

    return this.root.map(template => {
      return template.statements.toArray().map(statement => pretty(statement));
    });
  }

  splice(inlined: LinkedList<StatementSyntax>, reference: StatementSyntax) {
    let { statements } = this;
    let head = inlined.head();
    statements.spliceList(inlined, reference);
    statements.remove(reference);
    return head;
  }

  replace(statement: StatementSyntax, reference: StatementSyntax) {
    let { statements } = this;
    statements.insertBefore(statement, reference);
    statements.remove(reference);
    return statement;
  }

  render(self: any, env: Environment<any>, options: RenderOptions, blockArguments: any[]=null) {
    let { hostOptions } = options;
    let { locals: localNames } = this;

    let elementStack = new ElementStack({ dom: env.getDOM(), parentNode: options.appendTo, nextSibling: null });
    let vm = VM.initial(env, { self, localNames, blockArguments, hostOptions, elementStack });

    return vm.execute(this);
  }
}

export class TemplateEvaluation {
  static evaluate(template: Template, stack: ElementStack, frame: Frame) {
    let evaluation = new TemplateEvaluation(template, stack, frame);
    evaluation.evaluate();
  }

  private template: Template;
  private statements: LinkedList<StatementSyntax>;
  private stack: ElementStack;
  private frame: Frame;
  private current: StatementSyntax;

  constructor(template: Template, stack: ElementStack, frame: Frame) {
    this.template = template;
    this.statements = template.statements;
    this.stack = stack;
    this.frame = frame;
    this.current = this.statements.head();
  }

  evaluate() {
    let { statements, stack, frame } = this;
    let current;

    while (!this.next());
  }

  goto(position: StatementSyntax) {
    this.current = position;
  }

  next(): boolean {
    let { current, statements, stack, frame } = this;
    if (current === null) return true;

    this.current = statements.nextNode(current);
    stack.appendStatement(current, frame, this);

    return false;
  }

  splice(inlined: LinkedList<StatementSyntax>, reference: StatementSyntax) {
    let { statements, current } = this;
    let head = inlined.head();
    statements.spliceList(inlined, current);
    statements.remove(reference);
    this.current = head;
  }

  takeHash(): LinkedList<AttributeSyntax> {
    let out = new LinkedList<AttributeSyntax>();

    let { template: { statements }, current: pointer } = this;
    let current = pointer as AttributeSyntax;
    let next;

    while (current) {
      if (!current[ATTRIBUTE_SYNTAX]) break;
      next = statements.nextNode(current);
      out.append(current.clone());
      current = next;
    }

    this.current = current;
    return out;
  }

  takeBlock(): LinkedList<StatementSyntax> {
    let nesting = 1;
    let out = new LinkedList<StatementSyntax>();
    let next;

    let { template: { statements }, current } = this;

    while (current) {
      next = statements.nextNode(current);
      if (current.type === 'open-element') nesting++;
      else if (current.type === 'close-element') nesting--;

      if (nesting === 0) break;
      out.append(current.clone());
      current = next;
    }

    this.current = statements.nextNode(current);
    return out;
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

type PathSexp = InternedString[];
type ExpressionSexp = any[];
type ParamsSexp = ExpressionSexp[];
type HashSexp = any[];

type BlockSexp = [InternedString, PathSexp, ParamsSexp, HashSexp, number, number];

export interface BlockOptions {

}

export class Block extends DynamicStatementSyntax {
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

  clone(): Block {
    return new Block(this);
  }

  prettyPrint() {
    let [params, hash] = this.args.prettyPrint();
    let block = new PrettyPrint('expr', this.path.join('.'), params, hash);
    return new PrettyPrint('block', 'block', [block], null, this.templates.prettyPrint());
  }

  evaluate(stack: ElementStack, frame: Frame, vm: VM<any>): BlockHelperMorph {
    let helper = frame.lookupHelper(this.path);
    let args = this.args.evaluate(frame);
    let templates = this.templates;

    return stack.createContentMorph(BlockHelperMorph, { helper, args, templates }, frame, vm);
  }
}

type UnknownSexp = [string, PathSexp, boolean];

export class Unknown extends DynamicExpression implements ExpressionSyntax {
  public type = "unknown";

  static fromSpec(sexp: UnknownSexp): Unknown {
    let [, path, unsafe] = sexp;

    return new Unknown({ ref: new Ref({ parts: path }), unsafe });
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

  clone(): Unknown {
    return new Unknown(this);
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

export class Append extends DynamicStatementSyntax {
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

  clone(): Append {
    return new Append(this);
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

export abstract class AttributeSyntax extends StatementSyntax {
  "e1185d30-7cac-4b12-b26a-35327d905d92": boolean;
  name: string;
  namespace: string;
  abstract valueSyntax(): ExpressionSyntax;
  abstract asEvaluated(frame: Frame): AttributeSyntax;
  abstract clone(): AttributeSyntax;
}

type DynamicPropSexp = [string, string, ExpressionSexp, string];

export class DynamicProp extends AttributeSyntax {
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

  clone(): DynamicProp {
    return new DynamicProp(this);
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
    let value = new EvaluatedRef({ ref: _value.evaluate(frame) });
    return new DynamicProp({ name, value });
  }

  evaluate(stack: ElementStack, frame: Frame): Morph {
    let { name, value: _value } = this;
    let value = _value.evaluate(frame);
    return stack.createMorph(SetPropertyMorph, { name, value }, frame);
  }
}

type DynamicAttrSexp = [InternedString, InternedString, ExpressionSexp, InternedString];

export class DynamicAttr extends AttributeSyntax {
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

  clone(): DynamicAttr {
    return new DynamicAttr(this);
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
    let value = new EvaluatedRef({ ref: _value.evaluate(frame) });
    return new DynamicAttr({ name, value, namespace });
  }

  evaluate(stack: ElementStack, frame: Frame): AttrMorph {
    let { name, value: _value, namespace } = this;
    let value = _value.evaluate(frame);
    return stack.createMorph(AttrMorph, { name, value, namespace }, frame);
  }
}

type AddClassSexpr = [InternedString, ExpressionSexp];

export class AddClass extends AttributeSyntax {
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

  clone(): AddClass {
    return new AddClass(this);
  }

  prettyPrint(): PrettyPrint {
    return new PrettyPrint('attr', 'attr', ['class', this.value.prettyPrint()]);
  }

  valueSyntax(): ExpressionSyntax {
    return this.value;
  }

  asEvaluated(frame: Frame): DynamicProp {
    let { value: _value } = this;
    let value = new EvaluatedRef({ ref: _value.evaluate(frame) });
    return new AddClass({ value });
  }

  evaluate(stack: ElementStack, frame: Frame): any {
    stack.addClass(this.value.evaluate(frame));
  }
}

export class CloseElement extends DynamicStatementSyntax {
  type = "close-element";

  static fromSpec() {
    return new CloseElement();
  }

  static build() {
    return new this();
  }

  clone(): CloseElement {
    return new CloseElement();
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

export class Text extends StaticStatementSyntax {
  type = "text";

  static fromSpec(node: TextSexp): Text {
    let [, content] = node;

    return new Text({ content });
  }

  static build(content): Text {
    return new this({ content });
  }

  public content: string;

  constructor(options: { content: string }) {
    super();
    this.content = options.content;
  }

  clone(): Text {
    return new Text(this);
  }


  prettyPrint() {
    return new PrettyPrint('append', 'text', [this.content]);
  }

  evaluate(stack: ElementStack) {
    stack.appendText(this.content);
    return null;
  }
}

type CommentSexp = [string, string];

export class Comment extends StaticStatementSyntax {
  type = "comment";

  static fromSpec(sexp: CommentSexp): Comment {
    let [, value] = sexp;

    return new Comment({ value });
  }

  static build(value): Comment {
    return new this({ value });
  }

  public value: string;

  constructor(options) {
    super();
    this.value = options.value;
  }

  clone(): Comment {
    return new Comment(this);
  }

  prettyPrint() {
    return new PrettyPrint('append', 'append-comment', [this.value]);
  }

  evaluate(stack: ElementStack) {
    stack.appendComment(this.value);
    return null;
  }
}

type OpenElementSexp = [InternedString, InternedString, InternedString[]];

export class OpenElement extends StaticStatementSyntax {
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

  clone(): OpenElement {
    return new OpenElement(this);
  }

  prettyPrint() {
    let params = new PrettyPrint('block-params', 'as', this.blockParams);
    return new PrettyPrint('element', 'open-element', [this.tag, params]);
  }

  toIdentity(): OpenPrimitiveElement {
    let { tag } = this;
    return new OpenPrimitiveElement({ tag });
  }

  evaluate(stack: ElementStack, frame: Frame, vm: VM<any>): Morph {
    let { tag } = this;

    let def = frame.getComponentDefinition([tag], this);
    if (def) {
      let hashSyntax = evaluation.takeHash();
      let hash = attrListToHash(hashSyntax).evaluate(frame);
      let template = new Template({ statements: evaluation.takeBlock(), locals: this.blockParams });
      let templates = Templates.build(template, null, Template.fromList(hashSyntax));

      stack.openComponent(def, { tag, frame, templates, hash });
    } else {
      stack.openElement(tag);
    }

    return null;
  }
}

export class OpenPrimitiveElement extends StaticStatementSyntax {
  type = "open-primitive-element";

  public tag: InternedString;

  static build(tag: string): OpenPrimitiveElement {
    return new this({ tag: intern(tag) });
  }

  constructor(options: { tag: InternedString }) {
    super();
    this.tag = options.tag;
  }

  clone(): OpenPrimitiveElement {
    return new OpenPrimitiveElement(this);
  }

  prettyPrint() {
    return new PrettyPrint('element', 'open-element', [this.tag]);
  }

  evaluate(stack: ElementStack, frame: Frame) {
    stack.openElement(this.tag);
    return null;
  }
}

export function attrListToHash(attrs: LinkedList<AttributeSyntax>): Hash {
  let d = dict<ExpressionSyntax>();

  attrs.forEachNode(attr => {
    d[attr.name] = attr.valueSyntax();
  });

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

interface JumpOptions {
  jumpTo: StatementSyntax;
}

export class Jump extends StatementSyntax {
  public jumpTo: StatementSyntax;

  constructor({ jumpTo }: JumpOptions) {
    super();
    this.jumpTo = jumpTo;
  }

  clone(): Jump {
    return new Jump(this);
  }

  evaluate(stack: ElementStack, frame: Frame, vm: VM<any>) {
    vm.goto(this.jumpTo);
    return null;
  }
}

interface JumpIfOptions {
  condition: ExpressionSyntax;
  jumpTo: StatementSyntax;
}

export class JumpIf extends StatementSyntax {
  public condition: ExpressionSyntax;
  public jumpTo: StatementSyntax;

  constructor({ condition, jumpTo }: JumpIfOptions) {
    super();
    this.condition = condition;
    this.jumpTo = jumpTo;
  }

  clone(): JumpIf {
    return new JumpIf(this);
  }

  evaluate(stack: ElementStack, frame: Frame, vm: VM<any>) {
    let value = this.condition.evaluate(frame).value();

    if (value) {
      vm.goto(this.jumpTo);
    }

    return null;
  }
}

interface JumpUnlessOptions {
  condition: ExpressionSyntax;
  jumpTo: StatementSyntax;
}

export class JumpUnless extends StatementSyntax {
  public condition: ExpressionSyntax;
  public jumpTo: StatementSyntax;

  constructor({ condition, jumpTo }: JumpUnlessOptions) {
    super();
    this.condition = condition;
    this.jumpTo = jumpTo;
  }

  clone(): JumpUnless {
    return new JumpUnless(this);
  }

  evaluate(stack: ElementStack, frame: Frame, vm: VM<any>) {
    let value = this.condition.evaluate(frame).value();

    if (!value) {
      vm.goto(this.jumpTo);
    }

    return null;
  }
}

export class YieldSyntax extends StatementSyntax {
  type = "yield";
  isStatic = false;
  public args: ParamsAndHash;

  constructor({ args }: { args: ParamsAndHash }) {
    super();
    this.args = args;
  }

  clone(): YieldSyntax {
    return new YieldSyntax(this);
  }

  prettyPrint() {
    return `{{yield}}`;
  }

  evaluate(stack: ElementStack, frame: Frame): BlockInvocationMorph {
    let yieldTo: InternedString = null, params: EvaluatedParams = null;

    if (this.args) {
      params = this.args.params.evaluate(frame);
      let hash = this.args.hash.evaluate(frame);
      let toRef = hash.at(LITERAL('to'));
      yieldTo = toRef && toRef.value();
    }

    let block = frame.scope().getBlock(yieldTo || LITERAL('default'));

    if (!block) throw new Error(`The block ${yieldTo} wasn't available to be yielded to.`);

    return stack.createBlockMorph(block, frame, params);
  }
}



class NoopMorph extends CloseElementMorph {
  init() {}
  append() {}
  update() {}
}

type StaticAttrSexp = [InternedString, InternedString, InternedString, InternedString];

export class StaticAttr extends AttributeSyntax {
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

  clone(): StaticAttr {
    return new StaticAttr(this);
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

    return null;
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

  public value: boolean | string | number;

  constructor(value) {
    super();
    this.value = value;
  }

  clone(): Value {
    return new Value(this);
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

    return new Get({ ref: new Ref({ parts }) });
  }

  static build(path: string): Get {
    return new this({ ref: Ref.build(path) });
  }

  public ref: Ref;

  constructor(options) {
    super();
    this.ref = options.ref;
  }

  clone(): Get {
    return new Get(this);
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
    return new this({ parts: internPath(path) });
  }

  public parts: InternedString[];

  constructor({ parts }: { parts: InternedString[] }) {
    super();
    this.parts = parts;
  }

  clone(): Ref {
    return new Ref(this);
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

export class EvaluatedRef extends DynamicExpression {
  public type = "evaluated-ref";
  public ref: ChainableReference;
  public isStatic = false;

  constructor(options: { ref: ChainableReference }) {
    super();
    this.ref = options.ref;
  }

  clone(): EvaluatedRef {
    return new EvaluatedRef(this);
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
      ref: new Ref({ parts: path }),
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

export class Concat extends DynamicExpression {
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
    super();
    this.parts = options.parts;
  }

  clone(): Concat {
    return new Concat(this);
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

const EMPTY_LIST = new LinkedList<StatementSyntax>();

export function buildStatements(statements: any[], templates: Template[]): LinkedList<StatementSyntax> {
  if (statements.length === 0) { return EMPTY_LIST; }

  let list = new LinkedList<StatementSyntax>();

  statements.forEach(s => {
    let statement: typeof StatementSyntax = StatementNodes[s[0]];
    list.append(statement.fromSpec(s, templates));
  })

  return list;
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