import { RenderResult } from './render';
import { Frame } from './environment';
import { VM } from './vm';

import {
  Opcode,
  OpSeq,
  StatementSyntax,
  ExpressionSyntax,
  PrettyPrint,
  PrettyPrintable,
  PrettyPrintValue
} from './opcodes';

import {
  ArgsOpcode,
  EnterOpcode,
  ExitOpcode,
  EvaluateOpcode
} from './opcodes/vm';

import {
  ChainableReference,
  PushPullReference,
  ConstReference,
  PathReference
} from 'htmlbars-reference';
import { ElementStack, ClassList } from './builder';
import { Environment, Insertion, Helper as EnvHelper } from './environment';
import { LinkedList, LinkedListNode, LITERAL, InternedString, Dict, dict, intern, assign } from 'htmlbars-util';

import {
  TextOpcode,
  OpenPrimitiveElementOpcode,
  CloseElementOpcode,
  StaticAttrOpcode,
  DynamicAttrOpcode,
  DynamicPropOpcode,
  AddClassOpcode,
  CommentOpcode
} from './opcodes/dom';

import {
  AppendOpcode,
  TrustingAppendOpcode
} from './opcodes/content';

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

export class RawTemplate {
  syntax: LinkedList<StatementSyntax>;
  ops: OpSeq = null;
  locals: InternedString[];

  static fromOpSeq(ops: OpSeq, locals: InternedString[]) {
    return new RawTemplate({ ops, locals, syntax: null });
  }

  constructor({ ops, locals, syntax }: { ops: OpSeq, locals: InternedString[], syntax?: LinkedList<StatementSyntax> }) {
    this.ops = ops;
    this.locals = locals;
    this.syntax = syntax || null;
  }

  opcodes(env: Environment<any>): OpSeq {
    if (this.ops) return this.ops;
    this.compile(env);
    return this.ops;
  }

  compile(env: Environment<any>) {
    let compiled = new LinkedList<Opcode>();
    this.syntax.forEachNode(statement => env.statement(statement).compile(compiled, env));
    this.ops = compiled;
  }
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
  spec: any[];
  isEmpty: boolean;
  raw: RawTemplate;

  constructor({ meta, root, position, locals, statements, spec, isEmpty }: TemplateOptions) {
    statements = statements || new LinkedList<StatementSyntax>();

    this.meta = meta || {};
    this.root = root || null;
    this.position = position === undefined ? null : position;
    this.arity = locals ? locals.length : 0;
    this.raw = new RawTemplate({ ops: null, locals, syntax: statements })
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

  render(self: any, env: Environment<any>, options: RenderOptions, blockArguments: any[]=null) {
    let { hostOptions } = options;
    let { raw: { locals: localNames } } = this;

    let elementStack = new ElementStack({ dom: env.getDOM(), parentNode: options.appendTo, nextSibling: null });
    let vm = VM.initial(env, { self, localNames, blockArguments, hostOptions, elementStack });

    return vm.execute(this.raw.opcodes(env));
  }
}

type PathSexp = InternedString[];
type ExpressionSexp = any[];
type ParamsSexp = ExpressionSexp[];
type HashSexp = any[];

type BlockSexp = [InternedString, PathSexp, ParamsSexp, HashSexp, number, number];

export interface BlockOptions {

}

export class Block extends StatementSyntax {
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

  compile(ops: OpSeq) {
    throw new Error("SyntaxError");
  }

  prettyPrint() {
    let [params, hash] = this.args.prettyPrint();
    let block = new PrettyPrint('expr', this.path.join('.'), params, hash);
    return new PrettyPrint('block', 'block', [block], null, this.templates.prettyPrint());
  }
}

type UnknownSexp = [string, PathSexp, boolean];

export class Unknown extends ExpressionSyntax {
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

  evaluate(frame: Frame): PathReference {
    return this.ref.evaluate(frame);
  }

  simplePath(): InternedString {
    return this.ref.simplePath();
  }
}

type AppendSexp = [InternedString, ExpressionSexp, boolean];

export class Append extends StatementSyntax {
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

  prettyPrint(): PrettyPrint {
    let operation = this.trustingMorph ? 'html' : 'text';
    return new PrettyPrint('append', operation, [this.value.prettyPrint()]);
  }

  compile(ops: OpSeq) {
    ops.append(new ArgsOpcode(ParamsAndHash.fromParams(Params.build([this.value]))));

    if (this.trustingMorph) {
      ops.append(new TrustingAppendOpcode(this));
    } else {
      ops.append(new AppendOpcode(this));
    }
  }
}

class HelperInvocationReference extends PushPullReference implements PathReference {
  private helper: EnvHelper;
  private args: EvaluatedParamsAndHash;

  constructor(helper: EnvHelper, args: EvaluatedParamsAndHash) {
    super();
    this.helper = helper;
    this.args = this._addSource(args);
  }

  get() {
    throw new Error("Unimplemented: Yielding the result of a helper call.");
  }

  value(): Insertion {
    let { helper, args }  = this;
    let { params, hash } = args.value();
    return this.helper.call(undefined, params, hash, null);
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
}

type DynamicPropSexp = [InternedString, InternedString, ExpressionSexp, InternedString];

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
    return new this({ name: intern(name), value });
  }

  public name: InternedString;
  public value: ExpressionSyntax;

  constructor(options: { name: InternedString, value: ExpressionSyntax }) {
    super();
    this.name = options.name;
    this.value = options.value;
  }

  prettyPrint() {
    let { name, value } = this;

    return new PrettyPrint('attr', 'prop', [name, value.prettyPrint()]);
  }

  compile(ops: OpSeq) {
    ops.append(new ArgsOpcode(ParamsAndHash.fromParams(Params.build([this.value]))));
    ops.append(new DynamicPropOpcode(this));
  }

  valueSyntax(): ExpressionSyntax {
    return this.value;
  }
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

  prettyPrint() {
    let { name, value, namespace } = this;

    if (namespace) {
      return new PrettyPrint('attr', 'attr', [name, value], { namespace });
    } else {
      return new PrettyPrint('attr', 'attr', [name, value]);
    }
  }

  compile(ops: OpSeq) {
    ops.append(new StaticAttrOpcode(this));
  }

  valueSyntax(): ExpressionSyntax {
    return Value.build(this.value);
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
  value: ExpressionSyntax;
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

  compile(ops: OpSeq) {
    ops.append(new ArgsOpcode(ParamsAndHash.fromParams(Params.build([this.value]))));
    ops.append(new DynamicAttrOpcode(this));
  }

  valueSyntax(): ExpressionSyntax {
    return this.value;
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

  prettyPrint(): PrettyPrint {
    return new PrettyPrint('attr', 'attr', ['class', this.value.prettyPrint()]);
  }

  compile(ops: OpSeq) {
    ops.append(new ArgsOpcode(ParamsAndHash.fromParams(Params.build([this.value]))));
    ops.append(new AddClassOpcode());
  }

  valueSyntax(): ExpressionSyntax {
    return this.value;
  }
}

export class CloseElement extends StatementSyntax {
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

  compile(seq: OpSeq) {
    seq.append(new CloseElementOpcode());
  }
}

type TextSexp = [InternedString, InternedString];

export class Text extends StatementSyntax {
  type = "text";

  static fromSpec(node: TextSexp): Text {
    let [, content] = node;

    return new Text({ content });
  }

  static build(content): Text {
    return new this({ content });
  }

  public content: InternedString;

  constructor(options: { content: InternedString }) {
    super();
    this.content = options.content;
  }

  prettyPrint() {
    return new PrettyPrint('append', 'text', [this.content]);
  }

  compile(opcodes: LinkedList<Opcode>) {
    opcodes.append(new TextOpcode(this.content));
  }
}

type CommentSexp = [InternedString, InternedString];

export class Comment extends StatementSyntax {
  type = "comment";

  static fromSpec(sexp: CommentSexp): Comment {
    let [, value] = sexp;

    return new Comment({ value });
  }

  static build(value: string): Comment {
    return new this({ value: intern(value) });
  }

  public value: InternedString;

  constructor(options) {
    super();
    this.value = options.value;
  }

  prettyPrint() {
    return new PrettyPrint('append', 'append-comment', [this.value]);
  }

  compile(ops: OpSeq) {
    ops.append(new CommentOpcode(this));
  }
}

type OpenElementSexp = [InternedString, InternedString, InternedString[]];

export class OpenElement extends StatementSyntax {
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

  compile(ops: OpSeq) {
    ops.append(new OpenPrimitiveElementOpcode(this.tag));
  }

  toIdentity(): OpenPrimitiveElement {
    let { tag } = this;
    return new OpenPrimitiveElement({ tag });
  }
}

export class OpenPrimitiveElement extends StatementSyntax {
  type = "open-primitive-element";

  public tag: InternedString;

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
}

export function attrListToHash(attrs: LinkedList<AttributeSyntax>): Hash {
  let d = dict<ExpressionSyntax>();

  attrs.forEachNode(attr => {
    d[attr.name] = attr.valueSyntax();
  });

  return Hash.build(d);
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

export class JumpIf extends StatementSyntax {
  public jumpTo: StatementSyntax;

  constructor({ jumpTo }: JumpOptions) {
    super();
    this.jumpTo = jumpTo;
  }

  clone(): JumpIf {
    return new JumpIf(this);
  }

  evaluate(stack, frame: Frame, vm) {
    if (frame.scope().condition.value()) {
      vm.goto(this.jumpTo);
    }

    return null;
  }
}

export class JumpUnless extends StatementSyntax {
  public jumpTo: StatementSyntax;

  constructor({ jumpTo }: JumpOptions) {
    super();
    this.jumpTo = jumpTo;
  }

  clone(): JumpUnless {
    return new JumpUnless(this);
  }

  evaluate(stack, frame: Frame, vm) {
    if (!frame.scope().condition.value()) {
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

export class Value extends ExpressionSyntax {
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
    return String(this.value);
  }

  evaluate(): PrimitiveReference {
    return new PrimitiveReference(this.value);
  }

  inner() {
    return this.value;
  }
}

type Path = InternedString[];
type GetSexp = [InternedString, Path];

export class Get extends ExpressionSyntax {
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

  prettyPrint() {
    return new PrettyPrint('expr', 'get', [this.ref.prettyPrint()], null);
  }

  evaluate(frame: Frame): PathReference {
    return this.ref.evaluate(frame);
  }
}

// intern paths because they will be used as keys
function internPath(path: string): InternedString[] {
  return path.split('.').map(intern);
}

// this is separated out from Get because Unknown also has a ref, but it
// may turn out to be a helper
class Ref extends ExpressionSyntax {
  type = "ref";

  static build(path: string): Ref {
    return new this({ parts: internPath(path) });
  }

  public parts: InternedString[];

  constructor({ parts }: { parts: InternedString[] }) {
    super();
    this.parts = parts;
  }

  prettyPrint() {
    return this.parts.join('.');
  }

  evaluate(frame: Frame): PathReference {
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

type HelperSexp = [string, PathSexp, ParamsSexp, HashSexp];

export class Helper extends ExpressionSyntax {
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
    super();
    this.ref = options.ref;
    this.args = options.args;
  }

  prettyPrint() {
    let [params, hash] = this.args.prettyPrint();
    return new PrettyPrint('expr', this.ref.prettyPrint(), params, hash);
  }

  evaluate(frame: Frame): PathReference {
    let helper = frame.lookupHelper(this.ref.parts);
    return new HelperInvocationReference(helper, this.args.evaluate(frame));
  }

  simplePath(): InternedString {
    return this.ref.simplePath();
  }
}

type ConcatSexp = [string, ParamsSexp];

export class Concat extends ExpressionSyntax {
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

  prettyPrint() {
    return new PrettyPrint('expr', 'concat', this.parts.map(p => p.prettyPrint()));
  }

  evaluate(frame: Frame): PushPullReference {
    return new ConcatReference(this, frame);
  }
}

class ConcatReference extends PushPullReference {
  private parts: ChainableReference[];

  constructor(concat: Concat, frame: Frame) {
    super();

    let parts = this.parts = [];

    concat.parts.forEach(part => {
      parts.push(this._addSource(part.evaluate(frame)));
    });
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

export class ParamsAndHash extends ExpressionSyntax {
  public type = "params-and-hash";

  static fromSpec(params: ParamsSexp, hash: HashSexp): ParamsAndHash {
    return new ParamsAndHash({ params: Params.fromSpec(params), hash: Hash.fromSpec(hash) });
  }

  static _empty: ParamsAndHash;

  static empty(): ParamsAndHash {
    return (this._empty = this._empty || new ParamsAndHash({ params: Params.empty(), hash: Hash.empty() }));
  }

  static fromParams(params: Params): ParamsAndHash {
    return new ParamsAndHash({ params, hash: Hash.empty() });
  }

  static fromHash(hash: Hash): ParamsAndHash {
    return new ParamsAndHash({ params: Params.empty(), hash });
  }

  static build(params: Params, hash: Hash): ParamsAndHash {
    return new this({ params, hash });
  }

  public params: Params;
  public hash: Hash;
  public isStatic = false;

  constructor(options: { params: Params, hash: Hash }) {
    super();
    this.params = options.params;
    this.hash = options.hash;
  }

  prettyPrint() {
    // return [this.params.prettyPrint(), this.hash.prettyPrint()];
    return null;
  }

  evaluate(frame: Frame): EvaluatedParamsAndHash {
    return new EvaluatedParamsAndHash(this, frame);
  }
}

export class EvaluatedParamsAndHash extends PushPullReference implements PathReference {
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

  get(): PathReference {
    return NULL_REFERENCE;
  }

  value(): { params: any[], hash: Dict<any> } {
    return { params: this.params.value(), hash: this.hash.value() };
  }
}

class NullReference extends ConstReference<any> implements PathReference {
  constructor() {
    super(null);
  }

  notify() {}

  get(): PathReference {
    return this;
  }
}

class PrimitiveReference extends ConstReference<any> implements PathReference {
  notify() {}

  get(): PathReference {
    return NULL_REFERENCE;
  }
}

const NULL_REFERENCE = new NullReference();

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

export class Params extends ExpressionSyntax {
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

  evaluate(frame: Frame): EvaluatedParams {
    return new EvaluatedParams(this, frame);
  }

  prettyPrint(): PrettyPrintValue {
    return <any>this.params.map(p => p.prettyPrint());
  }
}

export class EvaluatedParams extends PushPullReference implements PathReference {
  public references: PathReference[];

  constructor(params: Params, frame: Frame) {
    super();

    let references = [];

    params.forEach(param => {
      let result = param.evaluate(frame);
      this._addSource(result);
      references.push(result);
    });

    this.references = references;
  }

  get(index: string): PathReference {
    return this.references[index];
  }

  nth(n: number) {
    return this.references[n];
  }

  toArray(): PathReference[] {
    return this.references;
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

export class Hash extends ExpressionSyntax {
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
    super();
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

export class EvaluatedHash extends PushPullReference implements PathReference {
  public values: PathReference[];
  public keys: InternedString[];
  public map: Dict<PathReference>;

  constructor(hash: Hash, frame: Frame) {
    super();

    let { keys, values } = hash;
    let map = dict<PathReference>();

    this.values = values.map((value, i) => {
      let result = <PathReference>value.evaluate(frame);
      map[<string>keys[i]] = result;
      this._addSource(result);
      return result;
    });

    this.map = map;
    this.keys = hash.keys;
  }

  forEach(callback: (key: InternedString, value: PathReference) => void) {
    let values = this.values;
    this.keys.forEach((key, i) => callback(key, this.values[i]));
  }

  get(key: InternedString): PathReference {
    return this.map[<string>key];
  }

  at(key: InternedString): PathReference {
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

export class Templates extends ExpressionSyntax {
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
    super();
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