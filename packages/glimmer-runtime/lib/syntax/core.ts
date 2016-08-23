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
  SymbolLookup
} from '../syntax';

import {
  InlineBlock,
  Block as CompiledBlock
} from '../compiled/blocks';

import {
  Opcode
} from '../opcodes';

import OpcodeBuilderDSL from '../compiled/opcodes/builder';

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

import { EMPTY_ARRAY } from '../utils';

import { Opaque } from 'glimmer-util';

import {
  OpenPrimitiveElementOpcode,
  FlushElementOpcode,
  CloseElementOpcode,
  StaticAttrOpcode,
  DynamicAttrOpcode,
  DynamicAttrNSOpcode
} from '../compiled/opcodes/dom';

import {
  OptimizedCautiousAppendOpcode,
  OptimizedTrustingAppendOpcode,
  GuardedCautiousAppendOpcode,
  GuardedTrustingAppendOpcode
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
      path,
      args: Args.fromSpec(params, hash),
      templates: Templates.fromSpec([templateId, inverseId], children)
    });
  }

  static build(options): Block {
    return new this(options);
  }

  path: string[];
  args: Args;
  templates: Templates;

  constructor(options: { path: string[], args: Args, templates: Templates }) {
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
}

export class Unknown extends ExpressionSyntax<any> {
  public type = "unknown";

  static fromSpec(sexp: SerializedExpressions.Unknown): Unknown {
    let [, path] = sexp;

    return new Unknown({ ref: new Ref({ parts: path }) });
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

  compile(compiler: SymbolLookup, env: Environment, blockMeta: BlockMeta): CompiledExpression<Opaque> {
    let { ref } = this;

    if (env.hasHelper(ref.parts, blockMeta)) {
      return new CompiledHelper({ name: ref.parts, helper: env.lookupHelper(ref.parts, blockMeta), args: CompiledArgs.empty() });
    } else {
      return this.ref.compile(compiler);
    }
  }

  simplePath(): string {
    return this.ref.simplePath();
  }
}

interface AppendOpcode {
  new(): Opcode;
}

abstract class Append extends StatementSyntax {
  static fromSpec(sexp: SerializedStatements.Append): Append {
    let [, value, trustingMorph] = sexp;
    return new OptimizedAppend({ value: buildExpression(value), trustingMorph });
  }

  value: ExpressionSyntax<any>;
  trustingMorph: boolean;

  constructor({ value, trustingMorph }: { value: ExpressionSyntax<any>, trustingMorph: boolean }) {
    super();
    this.value = value;
    this.trustingMorph = trustingMorph;
  }
}

export class OptimizedAppend extends Append {
  public type = "optimized-append";

  deopt(): UnoptimizedAppend {
    return new UnoptimizedAppend(this);
  }

  compile(compiler: CompileInto & SymbolLookup, env: Environment, block: CompiledBlock) {
    compiler.append(new PutValueOpcode({ expression: this.value.compile(compiler, env, block.meta) }));

    if (this.trustingMorph) {
      compiler.append(new OptimizedTrustingAppendOpcode());
    } else {
      compiler.append(new OptimizedCautiousAppendOpcode());
    }
  }
}

export class UnoptimizedAppend extends Append {
  public type = "unoptimized-append";

  compile(compiler: CompileInto & SymbolLookup, env: Environment, block: CompiledBlock) {
    let expression = this.value.compile(compiler, env, block.meta);

    if (this.trustingMorph) {
      compiler.append(new GuardedTrustingAppendOpcode(expression));
    } else {
      compiler.append(new GuardedCautiousAppendOpcode(expression));
    }
  }
}

export const MODIFIER_SYNTAX = "c0420397-8ff1-4241-882b-4b7a107c9632";

export class Modifier extends StatementSyntax {
  "c0420397-8ff1-4241-882b-4b7a107c9632" = true;

  public type: string = "modifier";
  public path: string[];
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

  compile(compiler: CompileInto & SymbolLookup, env: Environment, blockMeta: BlockMeta) {
    let args = this.args.compile(compiler, env, blockMeta);

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
  public type = "static-arg";
  name: string;
  value: string;

  static fromSpec(node: SerializedStatements.StaticArg): StaticArg {
    let [, name, value] = node;
    return new StaticArg({ name, value });
  }

  static build(name: string, value: string, namespace: string=null): StaticArg {
    return new this({ name, value });
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
    return Value.build(this.value);
  }
}

export class DynamicArg extends ArgumentSyntax<Opaque> {
  public type = 'dynamic-arg';
  static fromSpec(sexp: SerializedStatements.DynamicArg): DynamicArg {
    let [, name, value] = sexp;

    return new DynamicArg({
      name,
      value: buildExpression(value)
    });
  }

  static build(name: string, value: ExpressionSyntax<string>): DynamicArg {
    return new this({ name, value });
  }

  name: string;
  value: ExpressionSyntax<Opaque>;
  namespace: string;

  constructor({ name, value, namespace = null }: { name: string, value: ExpressionSyntax<Opaque>, namespace?: string }) {
    super();
    this.name = name;
    this.value = value;
    this.namespace = namespace;
  }

  compile() {
    throw new Error(`Cannot compile DynamicArg for "${this.name}" as it is delegate for ExpressionSyntax<Opaque>.`);
  }

  valueSyntax() {
    return this.value;
  }
}

export class TrustingAttr {
  static fromSpec(sexp: SerializedStatements.TrustingAttr): DynamicAttr {
    let [, name, value, namespace] = sexp;
    return new DynamicAttr({
      name,
      namespace,
      isTrusting: true,
      value: buildExpression(value)
    });
  }

  static build(name: string, value: ExpressionSyntax<string>, isTrusting: boolean, namespace: string=null): DynamicAttr {
    return new DynamicAttr({ name, value, namespace, isTrusting });
  }

  compile() { throw new Error('Attempting to compile a TrustingAttr which is just a delegate for DynamicAttr.'); }
}

export class StaticAttr extends AttributeSyntax<string> {
  "e1185d30-7cac-4b12-b26a-35327d905d92" = true;
  type = "static-attr";

  static fromSpec(node: SerializedStatements.StaticAttr): StaticAttr {
    let [, name, value, namespace] = node;
    return new StaticAttr({ name, value: value as string, namespace });
  }

  static build(name: string, value: string, namespace: string=null): StaticAttr {
    return new this({ name, value, namespace });
  }

  name: string;
  value: string;
  namespace: string;
  isTrusting = false;

  constructor({ name, value, namespace = null }: { name: string, value: string, namespace?: string }) {
    super();
    this.name = name;
    this.value = value;
    this.namespace = namespace;
  }

  compile(compiler: CompileInto) {
    compiler.append(new StaticAttrOpcode(this));
  }

  valueSyntax(): ExpressionSyntax<string> {
    return Value.build(this.value);
  }
}

export class DynamicAttr extends AttributeSyntax<string> {
  "e1185d30-7cac-4b12-b26a-35327d905d92" = true;
  type = "dynamic-attr";

  static fromSpec(sexp: SerializedStatements.DynamicAttr): DynamicAttr {
    let [, name, value, namespace] = sexp;
    return new DynamicAttr({
      name,
      namespace,
      value: buildExpression(value)
    });
  }

  static build(name: string, value: ExpressionSyntax<string>, isTrusting = false, namespace: string=null): DynamicAttr {
    return new this({ name, value, namespace, isTrusting });
  }

  name: string;
  value: ExpressionSyntax<string>;
  namespace: string;
  isTrusting: boolean;

  constructor({ name, value, isTrusting = false, namespace = null }: { name: string, isTrusting?: boolean, value: ExpressionSyntax<string>, namespace?: string }) {
    super();
    this.name = name;
    this.value = value;
    this.namespace = namespace;
    this.isTrusting = isTrusting;
  }

  compile(compiler: CompileInto & SymbolLookup, env: Environment, blockMeta: BlockMeta) {
    let {namespace, value} = this;
    compiler.append(new PutValueOpcode({ expression: value.compile(compiler, env, blockMeta) }));
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

export class FlushElement extends StatementSyntax {
  type = "flush-element";

  static fromSpec() {
    return new FlushElement();
  }

  static build() {
    return new this();
  }

  compile(compiler: CompileInto) {
    compiler.append(new FlushElementOpcode());
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

  compile(compiler: CompileInto) {
    compiler.append(new CloseElementOpcode());
  }
}

export class Text extends StatementSyntax {
  type = "text";

  static fromSpec(node: SerializedStatements.Text): Text {
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

  compile(dsl: OpcodeBuilderDSL) {
    dsl.text(this.content);
  }
}

export class Comment extends StatementSyntax {
  type = "comment";

  static fromSpec(sexp: SerializedStatements.Comment): Comment {
    let [, value] = sexp;

    return new Comment({ value });
  }

  static build(value: string): Comment {
    return new this({ value: value });
  }

  public comment: string;

  constructor(options) {
    super();
    this.comment = options.value;
  }

  compile(dsl: OpcodeBuilderDSL) {
    dsl.comment(this.comment);
  }
}

export class OpenElement extends StatementSyntax {
  type = "open-element";

  static fromSpec(sexp: SerializedStatements.OpenElement): OpenElement {
    let [, tag, blockParams] = sexp;

    return new OpenElement({
      tag,
      blockParams: blockParams
    });
  }

  static build(tag: string, blockParams: string[]): OpenElement {
    return new this({ tag, blockParams });
  }

  public tag: string;
  public blockParams: string[];

  constructor(options: { tag: string, blockParams: string[] }) {
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

  compile(list: CompileInto, env: Environment) {
    list.append(new OpenPrimitiveElementOpcode(this.tag));
  }

  toIdentity(): OpenPrimitiveElement {
    let { tag } = this;
    return new OpenPrimitiveElement({ tag });
  }

  private parameters(scanner: BlockScanner): { args: Args, attrs: string[] } {
    let current = scanner.next();
    let attrs: string[] = [];
    let argKeys: string[] = [];
    let argValues: ExpressionSyntax<Opaque>[] = [];

    while (!(current instanceof FlushElement)) {
      if (current[MODIFIER_SYNTAX]) {
        throw new Error(`Compile Error: Element modifiers are not allowed in components`);
      }

      let param = <ParameterSyntax<Opaque>>current;

      if (current[ATTRIBUTE_SYNTAX]) {
        attrs.push(param.name);

        // REMOVE ME: attributes should not be treated as args
        argKeys.push(param.name);
        argValues.push(param.valueSyntax());
      } else if (current[ARGUMENT_SYNTAX]) {
        argKeys.push(param.name);
        argValues.push(param.valueSyntax());
      } else {
        throw new Error("Expected FlushElement, but got ${current}");
      }

      current = scanner.next();
    }

    return { args: Args.fromNamedArgs(NamedArgs.build(argKeys, argValues)), attrs };
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
  tag: string;
  attrs: string[];
  args: Args;
  template: InlineBlock;
}

export class Component extends StatementSyntax {
  public type = 'component';
  public tag: string;
  public attrs: string[];
  public args: Args;
  public template: InlineBlock;

  constructor({ tag, args, attrs, template }: ComponentOptions) {
    super();
    this.tag = tag;
    this.args = args;
    this.attrs = attrs;
    this.template = template;
  }

  compile(list: CompileInto & SymbolLookup, env: Environment, blockMeta: BlockMeta) {
    let definition = env.getComponentDefinition([this.tag]);
    let args = this.args.compile(list as SymbolLookup, env, blockMeta);
    let shadow = this.attrs;
    let templates = new Templates({ template: this.template, inverse: null });

    list.append(new PutComponentDefinitionOpcode(definition));
    list.append(new OpenComponentOpcode(args, shadow, templates));
    list.append(new CloseComponentOpcode());
  }
}

export class OpenPrimitiveElement extends StatementSyntax {
  type = "open-primitive-element";

  public tag: string;

  static build(tag: string): OpenPrimitiveElement {
    return new this({ tag });
  }

  constructor(options: { tag: string }) {
    super();
    this.tag = options.tag;
  }

  compile(compiler: CompileInto) {
    compiler.append(new OpenPrimitiveElementOpcode(this.tag));
  }
}

export class Yield extends StatementSyntax {
  static fromSpec(sexp: SerializedStatements.Yield): Yield {
    let [, to, params] = sexp;

    let args = Args.fromSpec(params, null);

    return new Yield({ to, args });
  }

  static build(params: ExpressionSyntax<Opaque>[], to: string): Yield {
    let args = Args.fromPositionalArgs(PositionalArgs.build(params));
    return new this({ to, args });
  }

  type = "yield";
  public to: string;
  public args: Args;

  constructor({ to, args }: { to: string, args: Args }) {
    super();
    this.to = to;
    this.args = args;
  }

  compile(compiler: CompileInto & SymbolLookup, env: Environment, blockMeta: BlockMeta) {
    let to = compiler.getBlockSymbol(this.to);
    let args = this.args.compile(compiler, env, blockMeta);
    compiler.append(new OpenBlockOpcode({ to, label: this.to, args }));
    compiler.append(new CloseBlockOpcode());
  }
}

class OpenBlockOpcode extends Opcode {
  type = "open-block";
  public to: number;
  public label: string;
  public args: CompiledArgs;

  constructor({ to, label, args }: { to: number, label: string, args: CompiledArgs }) {
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

  compile(compiler: SymbolLookup): CompiledExpression<Opaque> {
    return this.ref.compile(compiler);
  }
}

export class SelfGet extends ExpressionSyntax<Opaque> {
  type = "self-get";

  static fromSpec(sexp: SerializedExpressions.SelfGet): SelfGet {
    let [, parts] = sexp;

    return new SelfGet({ ref: new Ref({ parts }) });
  }

  public ref: Ref;

  constructor(options) {
    super();
    this.ref = options.ref;
  }

  compile(compiler: SymbolLookup): CompiledExpression<Opaque> {
    return this.ref.compile(compiler);
  }
}

export class GetArgument<T> extends ExpressionSyntax<T> {
  type = "get-argument";

  static fromSpec(sexp: SerializedExpressions.Arg): GetArgument<Opaque> {
    let [, parts] = sexp;

    return new GetArgument<Opaque>({ parts });
  }

  static build(path: string): GetArgument<Opaque> {
    return new this<Opaque>({ parts: path.split('.') });
  }

  public parts: string[];

  constructor(options: { parts: string[] }) {
    super();
    this.parts = options.parts;
  }

  compile(lookup: SymbolLookup): CompiledExpression<T> {
    let { parts } = this;
    let head = parts[0];
    let symbol = lookup.getNamedSymbol(head);

    let path = parts.slice(1);
    return new CompiledLocalRef({ debug: head, symbol, path });
  }
}

// this is separated out from Get because Unknown also has a ref, but it
// may turn out to be a helper
export class Ref extends ExpressionSyntax<Opaque> {
  type = "ref";

  static build(path: string): Ref {
    return new this({ parts: path.split('.') });
  }

  public parts: string[];

  constructor({ parts }: { parts: string[] }) {
    super();
    this.parts = parts;
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

  path(): string[] {
    return this.parts;
  }

  simplePath(): string {
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
      ref: new Ref({ parts: path }),
      args: Args.fromSpec(params, hash)
    });
  }

  static build(path: string, positional: PositionalArgs, named: NamedArgs): Helper {
    return new this({ ref: Ref.build(path), args: Args.build(positional, named) });
  }

  isStatic = false;
  ref: Ref;
  args: Args;

  constructor(options: { ref: Ref, args: Args }) {
    super();
    this.ref = options.ref;
    this.args = options.args;
  }

  compile(compiler: SymbolLookup, env: Environment, blockMeta: BlockMeta): CompiledExpression<Opaque> {
    if (env.hasHelper(this.ref.parts, blockMeta)) {
      let { args, ref } = this;
      return new CompiledHelper({ name: ref.parts, helper: env.lookupHelper(ref.parts, blockMeta), args: args.compile(compiler, env, blockMeta) });
    } else {
      throw new Error(`Compile Error: ${this.ref.path().join('.')} is not a helper`);
    }
  }

  simplePath(): string {
    return this.ref.simplePath();
  }
}

export class HasBlock extends ExpressionSyntax<boolean> {
  type = "has-block";

  static fromSpec(sexp: SerializedExpressions.HasBlock): HasBlock {
    let [, blockName] = sexp;
    return new HasBlock({ blockName });
  }

  static build(blockName: string): HasBlock {
    return new this({ blockName });
  }

  blockName: string;

  constructor({ blockName }: { blockName: string }) {
    super();
    this.blockName = blockName;
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
    return new HasBlockParams({ blockName });
  }

  static build(blockName: string): HasBlockParams {
    return new this({ blockName });
  }

  blockName: string;

  constructor({ blockName }: { blockName: string }) {
    super();
    this.blockName = blockName;
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

  compile(compiler: SymbolLookup, env: Environment, blockMeta: BlockMeta): CompiledConcat {
    return new CompiledConcat({ parts: this.parts.map(p => p.compile(compiler, env, blockMeta)) });
  }
}

export class Args {
  public type = "args";

  static empty(): Args {
    return EMPTY_ARGS;
  }

  static fromSpec(positional: SerializedCore.Params, named: SerializedCore.Hash): Args {
    return new Args(PositionalArgs.fromSpec(positional), NamedArgs.fromSpec(named));
  }

  static fromPositionalArgs(positional: PositionalArgs): Args {
    return new Args(positional, EMPTY_NAMED_ARGS);
  }

  static fromNamedArgs(named: NamedArgs): Args {
    return new Args(EMPTY_POSITIONAL_ARGS, named);
  }

  static build(positional: PositionalArgs, named: NamedArgs): Args {
    if (positional === EMPTY_POSITIONAL_ARGS && named === EMPTY_NAMED_ARGS) {
      return EMPTY_ARGS;
    } else {
      return new this(positional, named);
    }
  }

  constructor(
    public positional: PositionalArgs,
    public named: NamedArgs
  ) {
  }

  compile(compiler: SymbolLookup, env: Environment, blockMeta: BlockMeta): CompiledArgs {
    let { positional, named } = this;
    return CompiledArgs.create(positional.compile(compiler, env, blockMeta), named.compile(compiler, env, blockMeta));
  }
}

export class PositionalArgs {
  public type = "positional";

  static empty(): PositionalArgs {
    return EMPTY_POSITIONAL_ARGS;
  }

  static fromSpec(sexp: SerializedCore.Params): PositionalArgs {
    if (!sexp || sexp.length === 0) return EMPTY_POSITIONAL_ARGS;
    return new PositionalArgs(sexp.map(buildExpression));
  }

  static build(exprs: ExpressionSyntax<Opaque>[]): PositionalArgs {
    if (exprs.length === 0) {
      return EMPTY_POSITIONAL_ARGS;
    } else {
      return new this(exprs);
    }
  }

  public length: number;

  constructor(public values: ExpressionSyntax<Opaque>[]) {
    this.length = values.length;
  }

  slice(start?: number, end?: number): PositionalArgs {
    return PositionalArgs.build(this.values.slice(start, end));
  }

  at(index: number): ExpressionSyntax<Opaque> {
    return this.values[index];
  }

  compile(compiler: SymbolLookup, env: Environment, blockMeta: BlockMeta): CompiledPositionalArgs {
    return CompiledPositionalArgs.create(this.values.map(v => v.compile(compiler, env, blockMeta)));
  }
}

const EMPTY_POSITIONAL_ARGS = new (class extends PositionalArgs {
  constructor() {
    super(EMPTY_ARRAY);
  }

  slice(start?: number, end?: number): PositionalArgs {
    return this;
  }

  at(index: number): ExpressionSyntax<Opaque> {
    return undefined; // ??!
  }

  compile(compiler: SymbolLookup, env: Environment): CompiledPositionalArgs {
    return CompiledPositionalArgs.empty();
  }
});

export class NamedArgs {
  public type = "named";

  static empty(): NamedArgs {
    return EMPTY_NAMED_ARGS;
  }

  static fromSpec(sexp: SerializedCore.Hash): NamedArgs {
    if (sexp === null || sexp === undefined) { return EMPTY_NAMED_ARGS; }

    let [keys, exprs] = sexp;

    if (keys.length === 0) { return EMPTY_NAMED_ARGS; }

    return new this(keys, exprs.map(expr => buildExpression(expr)));
  }

  static build(keys: string[], values: ExpressionSyntax<Opaque>[]): NamedArgs {
    if (keys.length === 0) {
      return EMPTY_NAMED_ARGS;
    } else {
      return new this(keys, values);
    }
  }

  public length: number;

  constructor(
    public keys: string[],
    public values: ExpressionSyntax<Opaque>[]
  ) {
    this.length = keys.length;
  }

  at(key: string): ExpressionSyntax<Opaque> {
    let { keys, values } = this;
    let index = keys.indexOf(key);
    return values[index];
  }

  has(key: string): boolean {
    return this.keys.indexOf(key) !== -1;
  }

  compile(compiler: SymbolLookup, env: Environment, blockMeta: BlockMeta): CompiledNamedArgs {
    let { keys, values } = this;
    return new CompiledNamedArgs(keys, values.map(value => value.compile(compiler, env, blockMeta)));
  }
}

const EMPTY_NAMED_ARGS = new (class extends NamedArgs {
  constructor() {
    super(EMPTY_ARRAY, EMPTY_ARRAY);
  }

  at(key: string): ExpressionSyntax<Opaque> {
    return undefined; // ??!
  }

  has(key: string): boolean {
    return false;
  }

  compile(compiler: SymbolLookup, env: Environment): CompiledNamedArgs {
    return CompiledNamedArgs.empty();
  }
});

const EMPTY_ARGS: Args = new (class extends Args {
  constructor() {
    super(EMPTY_POSITIONAL_ARGS, EMPTY_NAMED_ARGS);
  }

  compile(compiler: SymbolLookup, env: Environment): CompiledArgs {
    return CompiledArgs.empty();
  }
});

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
