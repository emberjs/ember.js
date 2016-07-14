import { VM } from '../vm';

import {
  BlockScanner
} from '../scanner';

import {
  ATTRIBUTE as ATTRIBUTE_SYNTAX,
  ARGUMENT as ARGUMENT_SYNTAX,
  CompileInto,
  Parameter as ParameterSyntax,
  Attribute as AttributeSyntax,
  Argument as ArgumentSyntax,
  Expression as ExpressionSyntax,
  Statement as StatementSyntax,
  PrettyPrint,
  SymbolLookup
} from '../syntax';

import {
  InlineBlock,
  Block as CompiledBlock
} from '../compiled/blocks';

import {
  Opcode
} from '../opcodes';

import {
  PutValueOpcode
} from '../compiled/opcodes/vm';

import {
  PutComponentDefinitionOpcode,
  OpenComponentOpcode,
  CloseComponentOpcode
} from '../compiled/opcodes/component';

import {
  ModifierOpcode
} from '../compiled/opcodes/dom';

import buildExpression from './expressions';

import {
  CompiledArgs,
  CompiledNamedArgs,
  CompiledPositionalArgs,
} from '../compiled/expressions/args';

import CompiledValue from '../compiled/expressions/value';

import {
  CompiledLocalRef,
  CompiledKeywordRef,
  CompiledSelfRef
} from '../compiled/expressions/ref';

import CompiledHasBlock from '../compiled/expressions/has-block';

import CompiledHasBlockParams from '../compiled/expressions/has-block-params';

import CompiledHelper from '../compiled/expressions/helper';

import CompiledConcat from '../compiled/expressions/concat';

import {
  CompiledExpression
} from '../compiled/expressions';

import { Environment } from '../environment';

import {
  Opaque,
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
  DynamicAttrNSOpcode,
  CommentOpcode
} from '../compiled/opcodes/dom';

import {
  CautiousAppendOpcode,
  TrustingAppendOpcode
} from '../compiled/opcodes/content';

import {
  Statements as SerializedStatements,
  Expressions as SerializedExpressions,
  Core as SerializedCore,
  BlockMeta
} from 'glimmer-wire-format';

export interface BlockOptions {

}

export class Block extends StatementSyntax {
  public type = "block";

  static fromSpec(sexp: SerializedStatements.Block, children: InlineBlock[]): Block {
    let [, path, params, hash, templateId, inverseId] = sexp;

    return new Block({
      path: path as InternedString[],
      args: Args.fromSpec(params as InternedString[], hash),
      templates: Templates.fromSpec([templateId, inverseId], children)
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

  scan(scanner: BlockScanner): StatementSyntax {
    let { default: _default, inverse } = this.templates;

    if (_default) scanner.addChild(_default);
    if (inverse)  scanner.addChild(inverse);

    return this;
  }

  compile(ops: CompileInto) {
    throw new Error("SyntaxError");
  }

  prettyPrint() {
    return null;

    // let [params, hash] = this.args.prettyPrint();
    // let block = new PrettyPrint('expr', this.path.join('.'), params, hash);
    // return new PrettyPrint('block', 'block', [block], null, this.templates.prettyPrint());
  }
}

export class Unknown extends ExpressionSyntax<any> {
  public type = "unknown";

  static fromSpec(sexp: SerializedExpressions.Unknown): Unknown {
    let [, path] = sexp;

    return new Unknown({ ref: new Ref({ parts: path as InternedString[] }) });
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

  compile(compiler: SymbolLookup, env: Environment, parentMeta: BlockMeta): CompiledExpression<Opaque> {
    let { ref } = this;

    if (env.hasHelper(ref.parts, parentMeta)) {
      return new CompiledHelper({ name: ref.parts, helper: env.lookupHelper(ref.parts, parentMeta), args: CompiledArgs.empty() });
    } else {
      return this.ref.compile(compiler);
    }
  }

  simplePath(): InternedString {
    return this.ref.simplePath();
  }
}

export class Append extends StatementSyntax {
  public type = "append";

  static fromSpec(sexp: SerializedStatements.Append): Append {
    let [, value, trustingMorph] = sexp;

    return new Append({ value: buildExpression(value), trustingMorph });
  }

  static build(value: ExpressionSyntax<any>, trustingMorph: boolean) {
    return new this({ value, trustingMorph });
  }

  value: ExpressionSyntax<any>;
  trustingMorph: boolean;

  constructor({ value, trustingMorph }: { value: ExpressionSyntax<any>, trustingMorph: boolean }) {
    super();
    this.value = value;
    this.trustingMorph = trustingMorph;
  }

  prettyPrint(): PrettyPrint {
    let operation = this.trustingMorph ? 'html' : 'text';
    return new PrettyPrint('append', operation, [this.value.prettyPrint()]);
  }

  compile(compiler: CompileInto & SymbolLookup, env: Environment, block: CompiledBlock) {
    compiler.append(new PutValueOpcode({ expression: this.value.compile(compiler, env, block.meta) }));

    if (this.trustingMorph) {
      compiler.append(new TrustingAppendOpcode());
    } else {
      compiler.append(new CautiousAppendOpcode());
    }
  }
}

export const MODIFIER_SYNTAX = "c0420397-8ff1-4241-882b-4b7a107c9632";

export class Modifier extends StatementSyntax {
  "c0420397-8ff1-4241-882b-4b7a107c9632" = true;

  public type: string = "modifier";
  public path: InternedString[];
  public args: Args;

  static fromSpec(node) {
    let [, path, params, hash] = node;

    return new Modifier({
      path,
      args: Args.fromSpec(params, hash)
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
    super();
    this.path = options.path;
    this.args = options.args;
  }

  compile(compiler: CompileInto & SymbolLookup, env: Environment) {
    let args = this.args.compile(compiler, env);

    if (env.hasModifier(this.path)) {
      compiler.append(new ModifierOpcode({
        name: this.path[0],
        manager: env.lookupModifier(this.path),
        args
      }));
    } else {
      throw new Error(`Compile Error: ${this.path.join('.')} is not a modifier`);
    }
  }
}

export class StaticArg extends ArgumentSyntax<string> {
  public type: string = "static-arg";
  name: InternedString;
  value: InternedString;

  static fromSpec(node: SerializedStatements.StaticArg): StaticArg {
    let [, name, value] = node;

    return new StaticArg({ name: name as InternedString, value: value as InternedString });
  }

  static build(name: string, value: string, namespace: string=null): StaticArg {
    return new this({ name: intern(name), value: intern(value) });
  }

  constructor({ name, value }) {
    super();
    this.name = name;
    this.value = value;
  }

  compile() {
    throw new Error(`Cannot compiler StaticArg "${this.name}" as it is a delegate for ValueSyntax<string>.`);
  }

  valueSyntax(): ExpressionSyntax<string> {
    return Value.build(this.value as string);
  }

  prettyPrint() {
    return new PrettyPrint('staticArg', 'staticArg', [this.name, this.value]);
  }
}

export class DynamicArg extends ArgumentSyntax<Opaque> {
  static fromSpec(sexp: SerializedStatements.DynamicArg): DynamicArg {
    let [, name, value] = sexp;

    return new DynamicArg({
      name: name as InternedString,
      value: buildExpression(value)
    });
  }

  static build(_name: string, value: ExpressionSyntax<string>): DynamicArg {
    let name = intern(_name);
    return new this({ name, value });
  }

  name: InternedString;
  value: ExpressionSyntax<Opaque>;
  namespace: InternedString;

  constructor({ name, value, namespace = null }: { name: InternedString, value: ExpressionSyntax<Opaque>, namespace?: InternedString }) {
    super();
    this.name = name;
    this.value = value;
    this.namespace = namespace;
  }

  compile() {
    throw new Error(`Cannot compile DynamicArg for "${this.name}" as it is delegate for ExpressionSyntax<Opaque>.`);
  }

  prettyPrint() {
    let { name, value } = this;
    return new PrettyPrint('staticArg', 'staticArg', [name, value.prettyPrint()]);
  }

  valueSyntax() {
    return this.value;
  }
}

export class TrustingAttr {
  static fromSpec(sexp: SerializedStatements.TrustingAttr): DynamicAttr {
    let [, name, value, namespace] = sexp;
    return new DynamicAttr({
      name: name as InternedString,
      namespace: namespace as InternedString,
      isTrusting: true,
      value: buildExpression(value)
    });
  }

  static build(_name: string, value: ExpressionSyntax<string>, isTrusting: boolean, _namespace: string=null): DynamicAttr {
    let name = intern(_name);
    let namespace = _namespace ? intern(_namespace) : null;
    return new DynamicAttr({ name, value, namespace, isTrusting });
  }

  compile() { throw new Error('Attempting to compile a TrustingAttr which is just a delegate for DynamicAttr.'); }
}

export class StaticAttr extends AttributeSyntax<string> {
  "e1185d30-7cac-4b12-b26a-35327d905d92" = true;
  type = "static-attr";

  static fromSpec(node: SerializedStatements.StaticAttr): StaticAttr {
    let [, name, value, namespace] = node;
    return new StaticAttr({ name: name as InternedString, value: value as InternedString, namespace: namespace as InternedString });
  }

  static build(name: string, value: string, namespace: string=null): StaticAttr {
    return new this({ name: intern(name), value: intern(value), namespace: namespace && intern(namespace) });
  }

  name: InternedString;
  value: InternedString;
  namespace: InternedString;
  isTrusting = false;

  constructor({ name, value, namespace = null }: { name: InternedString, value: InternedString, namespace?: InternedString }) {
    super();
    this.name = name;
    this.value = value;
    this.namespace = namespace;
  }

  prettyPrint() {
    let { name, value, namespace } = this;

    if (namespace) {
      return new PrettyPrint('attr', 'attr', [name, value], { namespace });
    } else {
      return new PrettyPrint('attr', 'attr', [name, value]);
    }
  }

  compile(compiler: CompileInto) {
    compiler.append(new StaticAttrOpcode(this));
  }

  valueSyntax(): ExpressionSyntax<string> {
    return Value.build(this.value as string);
  }
}

export class DynamicAttr extends AttributeSyntax<string> {
  "e1185d30-7cac-4b12-b26a-35327d905d92" = true;
  type = "dynamic-attr";

  static fromSpec(sexp: SerializedStatements.DynamicAttr): DynamicAttr {
    let [, name, value, namespace] = sexp;
    return new DynamicAttr({
      name: name as InternedString,
      namespace: namespace as InternedString,
      value: buildExpression(value)
    });
  }

  static build(_name: string, value: ExpressionSyntax<string>, isTrusting: boolean = false, _namespace: string=null): DynamicAttr {
    let name = intern(_name);
    let namespace = _namespace ? intern(_namespace) : null;
    return new this({ name, value, namespace, isTrusting });
  }

  name: InternedString;
  value: ExpressionSyntax<string>;
  namespace: InternedString;
  isTrusting: boolean;

  constructor({ name, value, isTrusting = false, namespace = null }: { name: InternedString, isTrusting?: boolean, value: ExpressionSyntax<string>, namespace?: InternedString }) {
    super();
    this.name = name;
    this.value = value;
    this.namespace = namespace;
    this.isTrusting = isTrusting;
  }

  prettyPrint() {
    let { name, value, namespace } = this;

    if (namespace) {
      return new PrettyPrint('attr', 'attr', [name, value.prettyPrint()], { namespace });
    } else {
      return new PrettyPrint('attr', 'attr', [name, value.prettyPrint()]);
    }
  }

  compile(compiler: CompileInto & SymbolLookup, env: Environment) {
    let {namespace, value} = this;
    compiler.append(new PutValueOpcode({ expression: value.compile(compiler, env) }));
    if (namespace) {
      compiler.append(new DynamicAttrNSOpcode(this));
    } else {
      compiler.append(new DynamicAttrOpcode(this));
    }
  }

  valueSyntax(): ExpressionSyntax<string> {
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

  compile(compiler: CompileInto) {
    compiler.append(new CloseElementOpcode());
  }
}

export class Text extends StatementSyntax {
  type = "text";

  static fromSpec(node: SerializedStatements.Text): Text {
    let [, content] = node;

    return new Text({ content: content as InternedString });
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

  compile(compiler: CompileInto) {
    compiler.append(new TextOpcode({ text: this.content }));
  }
}

export class Comment extends StatementSyntax {
  type = "comment";

  static fromSpec(sexp: SerializedStatements.Comment): Comment {
    let [, value] = sexp;

    return new Comment({ value });
  }

  static build(value: string): Comment {
    return new this({ value: intern(value) });
  }

  public comment: InternedString;

  constructor(options) {
    super();
    this.comment = options.value;
  }

  prettyPrint() {
    return new PrettyPrint('append', 'append-comment', [this.comment]);
  }

  compile(compiler: CompileInto) {
    compiler.append(new CommentOpcode(this));
  }
}

export class OpenElement extends StatementSyntax {
  type = "open-element";

  static fromSpec(sexp: SerializedStatements.OpenElement): OpenElement {
    let [, tag, blockParams] = sexp;

    return new OpenElement({
      tag: tag as InternedString,
      blockParams: blockParams as InternedString[]
    });
  }

  static build(tag: string, blockParams: string[]): OpenElement {
    return new this({ tag: intern(tag), blockParams: blockParams && blockParams.map(intern) });
  }

  public tag: InternedString;
  public blockParams: InternedString[];

  constructor(options: { tag: InternedString, blockParams: InternedString[] }) {
    super();
    this.tag = options.tag;
    this.blockParams = options.blockParams;
  }

  scan(scanner: BlockScanner): StatementSyntax {
    let { tag } = this;

    if (scanner.env.hasComponentDefinition([tag])) {
      let { args, attrs } = this.parameters(scanner);
      scanner.startBlock();
      this.tagContents(scanner);
      let template = scanner.endBlock();
      return new Component({ tag, args, attrs, template });
    } else {
      return new OpenPrimitiveElement({ tag });
    }
  }

  prettyPrint() {
    let params = new PrettyPrint('block-params', 'as', this.blockParams);
    return new PrettyPrint('element', 'open-element', [this.tag, params]);
  }

  compile(list: CompileInto, env: Environment) {
    list.append(new OpenPrimitiveElementOpcode(this));
  }

  toIdentity(): OpenPrimitiveElement {
    let { tag } = this;
    return new OpenPrimitiveElement({ tag });
  }

  private parameters(scanner: BlockScanner): { args: Args, attrs: InternedString[] } {
    let current = scanner.next();
    let args = dict<ExpressionSyntax<Opaque>>();
    let attrs: InternedString[] = [];

    while (current[ATTRIBUTE_SYNTAX] || current[MODIFIER_SYNTAX] || current[ARGUMENT_SYNTAX]) {
      if (current[MODIFIER_SYNTAX]) {
        throw new Error(`Compile Error: Element modifiers are not allowed in components`);
      }

      let param = <ParameterSyntax<Opaque>>current;

      if (current[ATTRIBUTE_SYNTAX]) {
        attrs.push(param.name);
      }

      args[param.name] = param.valueSyntax();

      current = scanner.next();
    }

    scanner.unput(current);

    return { args: Args.fromNamedArgs(NamedArgs.build(args)), attrs };
  }

  private tagContents(scanner: BlockScanner) {
    let nesting = 1;

    while (true) {
      let current = scanner.next();
      if (current instanceof CloseElement && --nesting === 0) {
        break;
      }

      scanner.addStatement(current);

      if (current instanceof OpenElement || current instanceof OpenPrimitiveElement) {
        nesting++;
      }
    }
  }
}

interface ComponentOptions {
  tag: InternedString;
  attrs: InternedString[];
  args: Args;
  template: InlineBlock;
}

export class Component extends StatementSyntax {
  public type = 'component';
  public tag: InternedString;
  public attrs: InternedString[];
  public args: Args;
  public template: InlineBlock;

  constructor({ tag, args, attrs, template }: ComponentOptions) {
    super();
    this.tag = tag;
    this.args = args;
    this.attrs = attrs;
    this.template = template;
  }

  compile(list: CompileInto & SymbolLookup, env: Environment) {
    let definition = env.getComponentDefinition([this.tag]);
    let args = this.args.compile(list as SymbolLookup, env);
    let shadow = this.attrs;
    let templates = new Templates({ template: this.template, inverse: null });

    list.append(new PutComponentDefinitionOpcode({ args, definition }));
    list.append(new OpenComponentOpcode({ shadow, templates }));
    list.append(new CloseComponentOpcode());
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

  compile(compiler: CompileInto) {
    compiler.append(new OpenPrimitiveElementOpcode({ tag: this.tag }));
  }
}

export class Yield extends StatementSyntax {
  static fromSpec(sexp: SerializedStatements.Yield): Yield {
    let [, to, params] = sexp;

    let args = Args.fromSpec(params, null);

    return new Yield({ to: to as InternedString, args });
  }

  static build(params: ExpressionSyntax<Opaque>[], to: string): Yield {
    let args = Args.fromPositionalArgs(PositionalArgs.build(params));
    return new this({ to: intern(to), args });
  }

  type = "yield";
  public to: InternedString;
  public args: Args;

  constructor({ to, args }: { to: InternedString, args: Args }) {
    super();
    this.to = to;
    this.args = args;
  }

  compile(compiler: CompileInto & SymbolLookup, env: Environment) {
    let to = compiler.getBlockSymbol(this.to);
    let args = this.args.compile(compiler, env);
    compiler.append(new OpenBlockOpcode({ to, label: this.to, args }));
    compiler.append(new CloseBlockOpcode());
  }
}

class OpenBlockOpcode extends Opcode {
  type = "open-block";
  public to: number;
  public label: InternedString;
  public args: CompiledArgs;

  constructor({ to, label, args }: { to: number, label: InternedString, args: CompiledArgs }) {
    super();
    this.to = to;
    this.label = label;
    this.args = args;
  }

  evaluate(vm: VM) {
    let block = vm.scope().getBlock(this.to);
    let args;

    if (block) {
      args = this.args.evaluate(vm);
    }

    // FIXME: can we avoid doing this when we don't have a block?
    vm.pushCallerScope();

    if (block) {
      vm.invokeBlock(block, args);
    }
  }
}

export class CloseBlockOpcode extends Opcode {
  public type = "close-block";

  evaluate(vm: VM) {
    vm.popScope();
  }
}

export class Value<T extends SerializedExpressions.Value> extends ExpressionSyntax<T> {
  type = "value";

  static fromSpec<U extends SerializedExpressions.Value>(value: U): Value<U> {
    return new Value(value);
  }

  static build<U extends SerializedExpressions.Value>(value: U): Value<U> {
    return new this(value);
  }

  public value: T;

  constructor(value: T) {
    super();
    this.value = value;
  }

  prettyPrint() {
    return String(this.value);
  }

  inner(): T {
    return this.value;
  }

  compile(compiler: SymbolLookup): CompiledExpression<T> {
    return new CompiledValue<T>(this);
  }
}

export class Get extends ExpressionSyntax<Opaque> {
  type = "get";

  static fromSpec(sexp: SerializedExpressions.Get): Get {
    let [, parts] = sexp;

    return new Get({ ref: new Ref({ parts: parts as InternedString[] }) });
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

  compile(compiler: SymbolLookup): CompiledExpression<Opaque> {
    return this.ref.compile(compiler);
  }
}

export class GetArgument<T> extends ExpressionSyntax<T> {
  type = "get-argument";

  static fromSpec(sexp: SerializedExpressions.Arg): GetArgument<Opaque> {
    let [, parts] = sexp;

    return new GetArgument<Opaque>({ parts: parts as InternedString[] });
  }

  static build(path: string): GetArgument<Opaque> {
    return new this<Opaque>({ parts: path.split('.').map(intern) });
  }

  public parts: InternedString[];

  constructor(options: { parts: InternedString[] }) {
    super();
    this.parts = options.parts;
  }

  prettyPrint() {
    return new PrettyPrint('expr', 'get-argument', [this.parts.join('.')], null);
  }

  compile(lookup: SymbolLookup): CompiledExpression<T> {
    let { parts } = this;
    let head = parts[0];
    let symbol = lookup.getNamedSymbol(head);

    let path = parts.slice(1);
    return new CompiledLocalRef({ debug: head, symbol, path });
  }
}

// intern paths because they will be used as keys
function internPath(path: string): InternedString[] {
  return path.split('.').map(intern);
}

// this is separated out from Get because Unknown also has a ref, but it
// may turn out to be a helper
export class Ref extends ExpressionSyntax<Opaque> {
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

  compile(lookup: SymbolLookup): CompiledExpression<Opaque> {
    let { parts } = this;
    let head = parts[0];
    let path = parts.slice(1);

    if (lookup.hasKeyword(head)) {
      return new CompiledKeywordRef({ name: head, path });
    } if (lookup.hasLocalSymbol(head)) {
      let symbol = lookup.getLocalSymbol(head);
      return new CompiledLocalRef({ debug: head, symbol, path });
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

export class Helper extends ExpressionSyntax<Opaque> {
  type = "helper";

  static fromSpec(sexp: SerializedExpressions.Helper): Helper {
    let [, path, params, hash] = sexp;

    return new Helper({
      ref: new Ref({ parts: path as InternedString[] }),
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

  compile(compiler: SymbolLookup, env: Environment, parentMeta: BlockMeta): CompiledExpression<Opaque> {
    if (env.hasHelper(this.ref.parts, parentMeta)) {
      let { args, ref } = this;
      return new CompiledHelper({ name: ref.parts, helper: env.lookupHelper(ref.parts, parentMeta), args: args.compile(compiler, env) });
    } else {
      throw new Error(`Compile Error: ${this.ref.prettyPrint()} is not a helper`);
    }
  }

  simplePath(): InternedString {
    return this.ref.simplePath();
  }
}

export class HasBlock extends ExpressionSyntax<boolean> {
  type = "has-block";

  static fromSpec(sexp: SerializedExpressions.HasBlock): HasBlock {
    let [, blockName] = sexp;

    return new HasBlock({
      blockName: blockName as InternedString
    });
  }

  static build(blockName: InternedString): HasBlock {
    return new this({ blockName });
  }

  blockName: InternedString;

  constructor({ blockName }: { blockName: InternedString }) {
    super();
    this.blockName = blockName;
  }

  prettyPrint() {
    return new PrettyPrint('expr', 'has-block', [this.blockName]);
  }

  compile(compiler: SymbolLookup, env: Environment): CompiledHasBlock {
    return new CompiledHasBlock({
      blockName: this.blockName,
      blockSymbol: compiler.getBlockSymbol(this.blockName)
    });
  }
}

export class HasBlockParams extends ExpressionSyntax<boolean> {
  type = "has-block-params";

  static fromSpec(sexp: SerializedExpressions.HasBlockParams): HasBlockParams {
    let [, blockName] = sexp;

    return new HasBlockParams({
      blockName: blockName as InternedString
    });
  }

  static build(blockName: InternedString): HasBlockParams {
    return new this({ blockName });
  }

  blockName: InternedString;

  constructor({ blockName }: { blockName: InternedString }) {
    super();
    this.blockName = blockName;
  }

  prettyPrint() {
    return new PrettyPrint('expr', 'has-block-params', [this.blockName]);
  }

  compile(compiler: SymbolLookup, env: Environment): CompiledHasBlockParams {
    return new CompiledHasBlockParams({
      blockName: this.blockName,
      blockSymbol: compiler.getBlockSymbol(this.blockName)
    });
  }
}

export class Concat {
  type = "concat";

  static fromSpec(sexp: SerializedExpressions.Concat): Concat {
    let [, params] = sexp;

    return new Concat({ parts: params.map(buildExpression) });
  }

  static build(parts): Concat {
    return new this({ parts });
  }

  isStatic = false;
  parts: ExpressionSyntax<Opaque>[];

  constructor({ parts }: { parts: ExpressionSyntax<Opaque>[] }) {
    this.parts = parts;
  }

  prettyPrint() {
    return new PrettyPrint('expr', 'concat', this.parts.map(p => p.prettyPrint()));
  }

  compile(compiler: SymbolLookup, env: Environment): CompiledConcat {
    return new CompiledConcat({ parts: this.parts.map(p => p.compile(compiler, env)) });
  }
}

export class Args {
  public type = "args";

  static fromSpec(positional: SerializedCore.Params, named: SerializedCore.Hash): Args {
    return new Args({ positional: PositionalArgs.fromSpec(positional), named: NamedArgs.fromSpec(named) });
  }

  static _empty: Args;

  static empty(): Args {
    return (this._empty = this._empty || new Args({ positional: PositionalArgs.empty(), named: NamedArgs.empty() }));
  }

  static fromPositionalArgs(positional: PositionalArgs): Args {
    return new Args({ positional, named: NamedArgs.empty() });
  }

  static fromNamedArgs(named: NamedArgs): Args {
    return new Args({ positional: PositionalArgs.empty(), named });
  }

  static build(positional: PositionalArgs, named: NamedArgs): Args {
    return new this({ positional, named });
  }

  public positional: PositionalArgs;
  public named: NamedArgs;
  public isStatic = false;

  constructor(options: { positional: PositionalArgs, named: NamedArgs }) {
    this.positional = options.positional;
    this.named = options.named;
  }

  prettyPrint() {
    // return [this.positional.prettyPrint(), this.named.prettyPrint()];
    return null;
  }

  compile(compiler: SymbolLookup, env: Environment): CompiledArgs {
    let { positional, named } = this;
    return CompiledArgs.create({ positional: positional.compile(compiler, env), named: named.compile(compiler, env) });
  }
}

export class PositionalArgs {
  public type = "positional";

  static fromSpec(sexp: SerializedCore.Params): PositionalArgs {
    if (!sexp || sexp.length === 0) return PositionalArgs.empty();
    return new PositionalArgs(sexp.map(buildExpression));
  }

  static build(exprs: ExpressionSyntax<Opaque>[]): PositionalArgs {
    return new this(exprs);
  }

  static _empty: PositionalArgs;

  static empty(): PositionalArgs {
    return (this._empty = this._empty || new PositionalArgs([]));
  }

  values: ExpressionSyntax<Opaque>[];
  length: number;
  isStatic = false;

  constructor(exprs: ExpressionSyntax<Opaque>[]) {
    this.values = exprs;
    this.length = exprs.length;
  }

  slice(start?: number, end?: number): PositionalArgs {
    return PositionalArgs.build(this.values.slice(start, end));
  }

  at(index: number): ExpressionSyntax<Opaque> {
    return this.values[index];
  }

  compile(compiler: SymbolLookup, env: Environment): CompiledPositionalArgs {
    return CompiledPositionalArgs.create({ values: this.values.map(v => v.compile(compiler, env)) });
  }
}

export class NamedArgs {
  public type = "named";

  static fromSpec(sexp: SerializedCore.Hash): NamedArgs {
    if (sexp === null || sexp === undefined) { return NamedArgs.empty(); }
    let keys: InternedString[] = [];
    let values = [];
    let map = dict<ExpressionSyntax<Opaque>>();

    Object.keys(sexp).forEach(key => {
      keys.push(key as InternedString);
      let value = map[key] = buildExpression(sexp[key]);
      values.push(value);
    });

    return new this({ map });
  }

  static build(map: Dict<ExpressionSyntax<Opaque>>): NamedArgs {
    let keys = [];
    let values = [];

    Object.keys(map).forEach(k => {
      let value = map[k];
      keys.push(k as InternedString);
      values.push(value);
    });

    return new NamedArgs({ map });
  }

  static _empty;

  static empty(): NamedArgs {
    return (this._empty = this._empty || new NamedArgs({ map: dict<ExpressionSyntax<Opaque>>() }));
  }

  public map: Dict<ExpressionSyntax<Opaque>>;
  public isStatic = false;

  constructor({ map }: { map: Dict<ExpressionSyntax<Opaque>> }) {
    this.map = map;
  }

  prettyPrint() {
    return JSON.stringify(this.map);
  }

  add(key: InternedString, value: ExpressionSyntax<Opaque>) {
    this.map[<string>key] = value;
  }

  at(key: InternedString): ExpressionSyntax<Opaque> {
    return this.map[<string>key];
  }

  has(key: InternedString): boolean {
    return !!this.map[<string>key];
  }

  compile(compiler: SymbolLookup, env: Environment): CompiledNamedArgs {
    let { map } = this;

    let compiledMap = dict<CompiledExpression<Opaque>>();

    Object.keys(map).forEach(key => {
      compiledMap[key] = map[key].compile(compiler, env);
    });

    return CompiledNamedArgs.create({ map: compiledMap });
  }
}

export class Templates {
  public type = "templates";

  static fromSpec([templateId, inverseId]: [number, number], children: InlineBlock[]): Templates {
    return new Templates({
      template: templateId === null ? null : children[templateId],
      inverse: inverseId === null ? null : children[inverseId],
    });
  }

  static empty(): Templates {
    return new Templates({ template: null, inverse: null });
  }

  static build(template: InlineBlock, inverse: InlineBlock=null): Templates {
    return new this({ template, inverse });
  }

  public default: InlineBlock;
  public inverse: InlineBlock;

  constructor(options: { template: InlineBlock, inverse: InlineBlock }) {
    this.default = options.template;
    this.inverse = options.inverse;
  }
}
