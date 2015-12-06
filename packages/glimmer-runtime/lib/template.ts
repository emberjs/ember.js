import { VM } from './vm';
import Compiler, { RawTemplate } from './compiler';

import Syntax, {
  Program,
  AttributeSyntax,
  ExpressionSyntax,
  StatementSyntax,
  PrettyPrintValue,
  PrettyPrint
} from './syntax';

import Scanner from './scanner';

import {
  Opcode,
  OpSeq
} from './opcodes';

import {
  PutValue
} from './compiled/opcodes/vm';

import {
  OpenComponentOpcode
} from './compiled/opcodes/component';

import {
  CompiledArgs,
  CompiledNamedArgs,
  CompiledPositionalArgs,
  EvaluatedArgs
} from './compiled/expressions/args';

import CompiledValue from './compiled/expressions/value';

import {
  CompiledLocalRef,
  CompiledSelfRef
} from './compiled/expressions/ref';

import CompiledHelper from './compiled/expressions/helper';

import CompiledConcat from './compiled/expressions/concat';

import {
  CompiledExpression
} from './compiled/expressions';

import {
  PushPullReference,
  PathReference,
  UpdatableReference,
} from 'glimmer-reference';

import { ElementStack } from './builder';

import { Environment, Insertion, Helper as EnvHelper } from './environment';

import {
  LinkedList,
  InternedString,
  Dict,
  dict,
  intern,
} from 'glimmer-util';

import {
  TextOpcode,
  OpenPrimitiveElementOpcode,
  CloseElementOpcode,
  StaticAttrOpcode,
  DynamicAttrOpcode,
  DynamicPropOpcode,
  AddClassOpcode,
  CommentOpcode
} from './compiled/opcodes/dom';

import {
  AppendOpcode,
  TrustingAppendOpcode
} from './compiled/opcodes/content';

interface Bounds {
  parentNode(): Node;
  firstNode(): Node;
  lastNode(): Node;
}

interface Reference {}

type Spec = any[];

const EMPTY_ARRAY = Object.freeze([]);

interface TemplateOptions {
  meta?: Object;
  root?: Template[];
  parent?: Template;
  children?: Template[];
  position?: number;
  locals?: InternedString[];
  program?: Program;
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
  static fromSpec(specs: any[]): Template {
    let scanner = new Scanner(specs);
    return scanner.scan();
  }

  static fromList(program: Program): Template {
    return new Template({
      program,
      root: null,
      position: null,
      meta: null,
      locals: null,
      isEmpty: program.isEmpty(),
      spec: null
    });
  }

  static fromStatements(statements: StatementSyntax[]): Template {
    let program = new LinkedList<StatementSyntax>();
    statements.forEach(s => program.append(s));

    return new Template({
      program,
      root: null,
      position: null,
      meta: null,
      locals: null,
      isEmpty: statements.length === 0,
      spec: null
    });
  }

  meta: Object;
  parent: Template;
  children: Template[];
  root: Template[];
  position: number;
  arity: number;
  spec: any[];
  isEmpty: boolean;
  raw: RawTemplate;

  constructor({ meta, children, root, position, locals, program, spec, isEmpty }: TemplateOptions) {
    this.meta = meta || {};
    this.children = children;
    this.root = root || null;
    this.position = position === undefined ? null : position;
    this.arity = locals ? locals.length : 0;
    this.raw = new RawTemplate({ ops: null, locals, program })
    this.spec = spec || null;
    this.isEmpty = isEmpty === true ? isEmpty : program.isEmpty();
    Object.seal(this);
  }

  prettyPrint() {
    function pretty(obj) {
      if (typeof obj.prettyPrint === 'function') return obj.prettyPrint();
      else throw new Error(`Cannot pretty print ${obj.constructor.name}`);
    }

    return this.root.map(template => {
      return template.raw.program.toArray().map(statement => pretty(statement));
    });
  }

  render(self: any, env: Environment, options: RenderOptions, blockArguments: any[]=null) {
    let elementStack = new ElementStack({ dom: env.getDOM(), parentNode: options.appendTo, nextSibling: null });
    let vm = VM.initial(env, { self: new UpdatableReference(self), elementStack, size: this.raw.symbolTable.size });

    return vm.execute(this.raw.opcodes(env));
  }

  opcodes(env: Environment): OpSeq {
    return this.raw.opcodes(env);
  }
}

type PathSexp = InternedString[];
type ExpressionSexp = any[];
type PositionalArgsSexp = ExpressionSexp[];
type NamedArgsSexp = any[];

type BlockSexp = [InternedString, PathSexp, PositionalArgsSexp, NamedArgsSexp, number, number];

export interface BlockOptions {

}

export class Block extends StatementSyntax {
  public type = "block";

  static fromSpec(sexp: BlockSexp, children: Template[]): Block {
    let [, path, params, hash, templateId, inverseId] = sexp;

    return new Block({
      path,
      args: Args.fromSpec(params, hash),
      templates: Templates.fromSpec(null, [templateId, inverseId, children])
    });
  }

  static build(options): Block {
    return new this(options);
  }

  path: InternedString[];
  args: Args;
  templates: Templates;

  constructor(options: { path: InternedString[], args: Args, templates: Templates }) {
    super();
    this.path = options.path;
    this.args = options.args;
    this.templates = options.templates;
  }

  compile(ops: Compiler) {
    throw new Error("SyntaxError");
  }

  prettyPrint() {
    return null;

    // let [params, hash] = this.args.prettyPrint();
    // let block = new PrettyPrint('expr', this.path.join('.'), params, hash);
    // return new PrettyPrint('block', 'block', [block], null, this.templates.prettyPrint());
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

  compile(compiler: Compiler): CompiledExpression {
    let { ref } = this;

    if (compiler.env.hasHelper(ref.parts)) {
      return new CompiledHelper({ helper: compiler.env.lookupHelper(ref.parts), args: CompiledArgs.empty() });
    } else {
      return this.ref.compile(compiler);
    }
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

  compile(compiler: Compiler) {
    compiler.append(new PutValue(this.value.compile(compiler)));

    if (this.trustingMorph) {
      compiler.append(new TrustingAppendOpcode());
    } else {
      compiler.append(new AppendOpcode());
    }
  }
}

class HelperInvocationReference extends PushPullReference implements PathReference {
  private helper: EnvHelper;
  private args: EvaluatedArgs;

  constructor(helper: EnvHelper, args: EvaluatedArgs) {
    super();
    this.helper = helper;
    this.args = args;
  }

  get(): PathReference {
    throw new Error("Unimplemented: Yielding the result of a helper call.");
  }

  value(): Insertion {
    let { args: { positional, named } }  = this;
    return this.helper.call(undefined, positional.value(), named.value(), null);
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

type DynamicPropSexp = [InternedString, InternedString, ExpressionSexp, InternedString];

export class DynamicProp extends AttributeSyntax {
  "e1185d30-7cac-4b12-b26a-35327d905d92" = true;
  type = "dynamic-prop";

  static fromSpec(sexp: DynamicPropSexp): DynamicProp {
    let [, name, value] = sexp;

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

  compile(compiler: Compiler) {
    compiler.append(new PutValue(this.value.compile(compiler)));
    compiler.append(new DynamicPropOpcode(this));
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

  compile(compiler: Compiler) {
    compiler.append(new StaticAttrOpcode(this));
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

  compile(compiler: Compiler) {
    compiler.append(new PutValue(this.value.compile(compiler)));
    compiler.append(new DynamicAttrOpcode(this));
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

  compile(compiler: Compiler) {
    compiler.append(new PutValue(this.value.compile(compiler)));
    compiler.append(new AddClassOpcode());
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

  compile(compiler: Compiler) {
    compiler.append(new CloseElementOpcode());
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

  compile(compiler: Compiler) {
    compiler.append(new TextOpcode(this.content));
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

  compile(compiler: Compiler) {
    compiler.append(new CommentOpcode(this));
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

  compile(compiler: Compiler, env: Environment) {
    let component = env.getComponentDefinition([this.tag], this);

    if (component) {
      let attrs = compiler.sliceAttributes();
      let templates = new Templates({ template: compiler.templateFromTagContents(), inverse: null });
      compiler.append(new OpenComponentOpcode(component.compile(attrs, templates)));
    } else {
      compiler.append(new OpenPrimitiveElementOpcode(this.tag));
    }
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

  compile(compiler: Compiler) {
    compiler.append(new OpenPrimitiveElementOpcode(this.tag));
  }
}

export function attrListToHash(attrs: LinkedList<AttributeSyntax>): NamedArgs {
  let d = dict<ExpressionSyntax>();

  attrs.forEachNode(attr => {
    d[attr.name] = attr.valueSyntax();
  });

  return NamedArgs.build(d);
}

export class YieldSyntax extends StatementSyntax {
  type = "yield";
  isStatic = false;
  public args: Args;

  constructor({ args }: { args: Args }) {
    super();
    this.args = args;
  }

  compile(compiler: Compiler) {
    compiler.append(new InvokeBlockOpcode());
  }
}

class InvokeBlockOpcode extends Opcode {
  type = "invoke-block";

  evaluate(vm: VM) {
    vm.invokeTemplate(<InternedString>'default');
  }
}

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

  prettyPrint() {
    return String(this.value);
  }

  inner() {
    return this.value;
  }

  compile(compiler: Compiler): CompiledExpression {
    return new CompiledValue(this);
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

  compile(compiler: Compiler): CompiledExpression {
    return this.ref.compile(compiler);
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

  compile(compiler: Compiler): CompiledExpression {
    let { parts } = this;
    let front = parts[0];
    let symbol = compiler.getSymbol(front);

    if (symbol) {
      let lookup = parts.slice(1);
      return new CompiledLocalRef({ symbol, lookup });
    } else {
      return new CompiledSelfRef({ parts });
    }
  }

  path(): InternedString[] {
    return this.parts;
  }

  simplePath(): InternedString {
    if (this.parts.length === 1) {
      return this.parts[0];
    }
  }
}

type HelperSexp = [string, PathSexp, PositionalArgsSexp, NamedArgsSexp];

export class Helper extends ExpressionSyntax {
  type = "helper";

  static fromSpec(sexp: HelperSexp): Helper {
    let [, path, params, hash] = sexp;

    return new Helper({
      ref: new Ref({ parts: path }),
      args: Args.fromSpec(params, hash)
    });
  }

  static build(path: string, positional: PositionalArgs, named: NamedArgs): Helper {
    return new this({ ref: Ref.build(path), args: new Args({ positional, named }) });
  }

  isStatic = false;
  ref: Ref;
  args: Args;

  constructor(options: { ref: Ref, args: Args }) {
    super();
    this.ref = options.ref;
    this.args = options.args;
  }

  prettyPrint() {
    let [params, hash] = this.args.prettyPrint();
    return new PrettyPrint('expr', this.ref.prettyPrint(), params, hash);
  }

  compile(compiler: Compiler): CompiledExpression {
    if (compiler.env.hasHelper(this.ref.parts)) {
      let { args, ref } = this;
      return new CompiledHelper({ helper: compiler.env.lookupHelper(ref.parts), args: args.compile(compiler) });
    } else {
      throw new Error(`Compile Error: ${this.ref.prettyPrint()} is not a helper`);
    }
  }

  simplePath(): InternedString {
    return this.ref.simplePath();
  }
}

type ConcatSexp = [string, PositionalArgsSexp];

export class Concat extends Syntax<Concat> {
  type = "concat";

  static fromSpec(sexp: ConcatSexp): Concat {
    let [, params] = sexp;

    return new Concat({ parts: params.map(buildExpression) });
  }

  static build(parts): Concat {
    return new this({ parts });
  }

  isStatic = false;
  parts: ExpressionSyntax[];

  constructor({ parts }: { parts: ExpressionSyntax[] }) {
    super();
    this.parts = parts;
  }

  prettyPrint() {
    return new PrettyPrint('expr', 'concat', this.parts.map(p => p.prettyPrint()));
  }

  compile(compiler: Compiler): CompiledConcat {
    return new CompiledConcat({ parts: this.parts.map(p => p.compile(compiler)) });
  }
}

const ExpressionNodes = {
  get: Get,
  unknown: Unknown,
  helper: Helper,
  concat: Concat
};

function buildExpression(spec: Spec): ExpressionSyntax {
  if (typeof spec !== 'object' || spec === null) {
    return Value.fromSpec(spec);
  } else {
    return ExpressionNodes[spec[0]].fromSpec(spec);
  }
}

export class Args extends Syntax<Args> {
  public type = "args";

  static fromSpec(positional: PositionalArgsSexp, named: NamedArgsSexp): Args {
    return new Args({ positional: PositionalArgs.fromSpec(positional), named: NamedArgs.fromSpec(named) });
  }

  static _empty: Args;

  static empty(): Args {
    return (this._empty = this._empty || new Args({ positional: PositionalArgs.empty(), named: NamedArgs.empty() }));
  }

  static fromPositionalArgs(positional: PositionalArgs): Args {
    return new Args({ positional, named: NamedArgs.empty() });
  }

  static fromHash(named: NamedArgs): Args {
    return new Args({ positional: PositionalArgs.empty(), named });
  }

  static build(positional: PositionalArgs, named: NamedArgs): Args {
    return new this({ positional, named });
  }

  public positional: PositionalArgs;
  public named: NamedArgs;
  public isStatic = false;

  constructor(options: { positional: PositionalArgs, named: NamedArgs }) {
    super();
    this.positional = options.positional;
    this.named = options.named;
  }

  prettyPrint() {
    // return [this.positional.prettyPrint(), this.named.prettyPrint()];
    return null;
  }

  compile(compiler: Compiler): CompiledArgs {
    let { positional, named } = this;
    return CompiledArgs.create({ positional: positional.compile(compiler), named: named.compile(compiler) });
  }
}

export class PositionalArgs extends Syntax<PositionalArgs> {
  public type = "positional";

  static fromSpec(sexp: PositionalArgsSexp): PositionalArgs {
    if (!sexp || sexp.length === 0) return PositionalArgs.empty();
    return new PositionalArgs(sexp.map(buildExpression));
  }

  static build(exprs: ExpressionSyntax[]): PositionalArgs {
    return new this(exprs);
  }

  static _empty: PositionalArgs;

  static empty(): PositionalArgs {
    return (this._empty = this._empty || new PositionalArgs([]));
  }

  values: ExpressionSyntax[];
  length: number;
  isStatic = false;

  constructor(exprs: ExpressionSyntax[]) {
    super();
    this.values = exprs;
    this.length = exprs.length;
  }

  push(expr: ExpressionSyntax) {
    this.values.push(expr);
    this.length = this.values.length;
  }

  at(index: number): ExpressionSyntax {
    return this.values[index];
  }

  compile(compiler: Compiler): CompiledPositionalArgs {
    return CompiledPositionalArgs.create({ values: this.values.map(v => v.compile(compiler)) });
  }

  prettyPrint(): PrettyPrintValue {
    return <any>this.values.map(p => p.prettyPrint());
  }
}

export class NamedArgs extends Syntax<NamedArgs> {
  public type = "named";

  static fromSpec(rawPairs: NamedArgsSexp): NamedArgs {
    if (!rawPairs) { return NamedArgs.empty(); }

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

    return new NamedArgs({ keys, values, map });
  }

  static build(map: Dict<ExpressionSyntax>): NamedArgs {
    if (map === undefined) { return NamedArgs.empty(); }
    let keys = [];
    let values = [];

    Object.keys(map).forEach(key => {
      keys.push(key);
      values.push(map[key]);
    });

    return new this({ keys, values, map });
  }

  static _empty;

  static empty(): NamedArgs {
    return (this._empty = this._empty || new NamedArgs({ keys: EMPTY_ARRAY, values: EMPTY_ARRAY, map: dict<ExpressionSyntax>() }));
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

  prettyPrint() {
    let out = dict<PrettyPrintValue>();
    this.keys.forEach((key, i) => {
      out[<string>key] = this.values[i].prettyPrint();
    })
    return JSON.stringify(out);
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

  compile(compiler: Compiler): CompiledNamedArgs {
    let { keys, values: rawValues } = this;
    let values = rawValues.map(v => v.compile(compiler));

    return CompiledNamedArgs.create({ keys, values });
  }
}

export class Templates extends Syntax<Templates> {
  public type = "templates";

  static fromSpec(_, [templateId, inverseId, children]): Templates {
    return new Templates({
      template: templateId === null ? null : children[templateId],
      inverse: inverseId === null ? null : children[inverseId],
    });
  }

  static build(template: Template, inverse: Template=null, attributes: Template=null): Templates {
    return new this({ template, inverse });
  }

  public default: Template;
  public inverse: Template;

  constructor(options: { template: Template, inverse: Template }) {
    super();
    this.default = options.template;
    this.inverse = options.inverse;
  }

  prettyPrint(): string {
    let { default: _default, inverse } = this;

    return JSON.stringify({
      default: _default && _default.position,
      inverse: inverse && inverse.position
    });
  }

  evaluate(vm: VM): PathReference {
    throw new Error("unimplemented evaluate for ExpressionSyntax");
  }
}