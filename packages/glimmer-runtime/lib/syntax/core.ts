import { VM } from '../vm';

import {
  BlockScanner
} from '../scanner';

import SymbolTable from '../symbol-table';

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
  StaticPartialSyntax,
  DynamicPartialSyntax
} from './builtins/partial';

import {
  InlineBlock
} from '../compiled/blocks';

import { Opcode, OpcodeJSON } from '../opcodes';

import OpcodeBuilderDSL from '../compiled/opcodes/builder';

import { PutValueOpcode } from '../compiled/opcodes/vm';

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
  default as CompiledLookup,
  CompiledInPartialName,
  CompiledSelf,
  CompiledSymbol
} from '../compiled/expressions/lookups';

import {
  CompiledGetBlock,
  CompiledGetBlockBySymbol,
  CompiledHasBlockParams,
  CompiledInPartialGetBlock,
  default as CompiledHasBlock
} from '../compiled/expressions/has-block';

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
  Core as SerializedCore
} from 'glimmer-wire-format';

export class Block extends StatementSyntax {
  public type = "block";

  static fromSpec(sexp: SerializedStatements.Block, symbolTable: SymbolTable, scanner: BlockScanner): Block {
    let [, path, params, hash, templateId, inverseId] = sexp;

    let template = scanner.blockFor(symbolTable, templateId);
    let inverse = (typeof inverseId === 'number') ? scanner.blockFor(symbolTable, inverseId) : null;

    let templates = Templates.fromSpec(template, inverse);

    return new Block(
      path,
      Args.fromSpec(params, hash, templates)
    );
  }

  static build(path: string[], args: Args): Block {
    return new this(path, args);
  }

  constructor(
    public path: string[],
    public args: Args
  ) {
    super();
  }

  scan(scanner: BlockScanner): StatementSyntax {
    let { default: _default, inverse } = this.args.templates;

    if (_default) scanner.addChild(_default);
    if (inverse)  scanner.addChild(inverse);

    return this;
  }

  compile(ops: CompileInto) {
    throw new Error("SyntaxError");
  }
}

interface AppendOpcode {
  new(): Opcode;
}

export abstract class Append extends StatementSyntax {
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

  compile(compiler: CompileInto & SymbolLookup, env: Environment, symbolTable: SymbolTable) {
    compiler.append(new PutValueOpcode(this.value.compile(compiler, env, symbolTable)));

    if (this.trustingMorph) {
      compiler.append(new OptimizedTrustingAppendOpcode());
    } else {
      compiler.append(new OptimizedCautiousAppendOpcode());
    }
  }
}

export class UnoptimizedAppend extends Append {
  public type = "unoptimized-append";

  compile(compiler: CompileInto & SymbolLookup, env: Environment, symbolTable: SymbolTable) {
    let expression = this.value.compile(compiler, env, symbolTable);

    if (this.trustingMorph) {
      compiler.append(new GuardedTrustingAppendOpcode(expression, symbolTable));
    } else {
      compiler.append(new GuardedCautiousAppendOpcode(expression, symbolTable));
    }
  }
}

const MODIFIER_SYNTAX = "c0420397-8ff1-4241-882b-4b7a107c9632";

export class Modifier extends StatementSyntax {
  "c0420397-8ff1-4241-882b-4b7a107c9632" = true;

  public type: string = "modifier";
  public path: string[];
  public args: Args;

  static fromSpec(node) {
    let [, path, params, hash] = node;

    return new Modifier({
      path,
      args: Args.fromSpec(params, hash, EMPTY_TEMPLATES)
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

  compile(compiler: CompileInto & SymbolLookup, env: Environment, symbolTable: SymbolTable) {
    let args = this.args.compile(compiler, env, symbolTable);

    if (env.hasModifier(this.path, symbolTable)) {
      compiler.append(new ModifierOpcode(
        this.path[0],
        env.lookupModifier(this.path, symbolTable),
        args
      ));
    } else {
      throw new Error(`Compile Error: ${this.path.join('.')} is not a modifier`);
    }
  }
}

export class StaticArg extends ArgumentSyntax<string> {
  public type = "static-arg";

  static fromSpec(node: SerializedStatements.StaticArg): StaticArg {
    let [, name, value] = node;
    return new StaticArg(name, value as string);
  }

  static build(name: string, value: string, namespace: string=null): StaticArg {
    return new this(name, value);
  }

  constructor(public name: string, public value: string) {
    super();
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

    return new DynamicArg(
      name,
      buildExpression(value)
    );
  }

  static build(name: string, value: ExpressionSyntax<string>): DynamicArg {
    return new this(name, value);
  }

  constructor(
    public name: string,
    public value: ExpressionSyntax<Opaque>,
    public namespace: string = null
  ) {
    super();
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
    return new DynamicAttr(
      name,
      buildExpression(value),
      namespace,
      true
    );
  }

  static build(name: string, value: ExpressionSyntax<string>, isTrusting: boolean, namespace: string=null): DynamicAttr {
    return new DynamicAttr(name, value, namespace, isTrusting);
  }

  compile() { throw new Error('Attempting to compile a TrustingAttr which is just a delegate for DynamicAttr.'); }
}

export class StaticAttr extends AttributeSyntax<string> {
  "e1185d30-7cac-4b12-b26a-35327d905d92" = true;
  type = "static-attr";

  static fromSpec(node: SerializedStatements.StaticAttr): StaticAttr {
    let [, name, value, namespace] = node;
    return new StaticAttr(name, value as string, namespace);
  }

  static build(name: string, value: string, namespace: string=null): StaticAttr {
    return new this(name, value, namespace);
  }

  isTrusting = false;

  constructor(
    public name: string,
    public value: string,
    public namespace: string
  ) {
    super();
  }

  compile(compiler: CompileInto) {
    compiler.append(new StaticAttrOpcode(this.namespace, this.name, this.value));
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
    return new DynamicAttr(
      name,
      buildExpression(value),
      namespace
    );
  }

  static build(name: string, value: ExpressionSyntax<string>, isTrusting = false, namespace: string=null): DynamicAttr {
    return new this(name, value, namespace, isTrusting);
  }

  constructor(
    public name: string,
    public value: ExpressionSyntax<string>,
    public namespace: string = undefined,
    public isTrusting?: boolean,
  ) {
    super();
  }

  compile(compiler: CompileInto & SymbolLookup, env: Environment, symbolTable: SymbolTable) {
    let {namespace, value} = this;
    compiler.append(new PutValueOpcode(value.compile(compiler, env, symbolTable)));
    if (namespace) {
      compiler.append(new DynamicAttrNSOpcode(this.name, this.namespace, this.isTrusting));
    } else {
      compiler.append(new DynamicAttrOpcode(this.name, this.isTrusting));
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
    return new Text(content);
  }

  static build(content): Text {
    return new this(content);
  }

  constructor(public content: string) {
    super();
  }

  compile(dsl: OpcodeBuilderDSL) {
    dsl.text(this.content);
  }
}

export class Comment extends StatementSyntax {
  type = "comment";

  static fromSpec(sexp: SerializedStatements.Comment): Comment {
    let [, value] = sexp;

    return new Comment(value);
  }

  static build(value: string): Comment {
    return new this(value);
  }

  constructor(public comment: string) {
    super();
  }

  compile(dsl: OpcodeBuilderDSL) {
    dsl.comment(this.comment);
  }
}

export class OpenElement extends StatementSyntax {
  type = "open-element";

  static fromSpec(sexp: SerializedStatements.OpenElement, symbolTable: SymbolTable): OpenElement {
    let [, tag, blockParams] = sexp;

    return new OpenElement(
      tag,
      blockParams,
      symbolTable
    );
  }

  static build(tag: string, blockParams: string[], symbolTable: SymbolTable): OpenElement {
    return new this(tag, blockParams, symbolTable);
  }

  constructor(
    public tag: string,
    public blockParams: string[],
    public symbolTable: SymbolTable
  ) {
    super();
  }

  scan(scanner: BlockScanner): StatementSyntax {
    let { tag } = this;

    if (scanner.env.hasComponentDefinition([tag], this.symbolTable)) {
      let { args, attrs } = this.parameters(scanner);
      scanner.startBlock(this.blockParams);
      this.tagContents(scanner);
      let template = scanner.endBlock(this.blockParams);
      args.templates = Templates.fromSpec(template);
      return new Component(tag, attrs, args);
    } else {
      return new OpenPrimitiveElement(tag);
    }
  }

  compile(list: CompileInto, env: Environment) {
    list.append(new OpenPrimitiveElementOpcode(this.tag));
  }

  toIdentity(): OpenPrimitiveElement {
    let { tag } = this;
    return new OpenPrimitiveElement(tag);
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

    return { args: Args.fromNamedArgs(NamedArgs.build(argKeys, argValues), EMPTY_TEMPLATES), attrs };
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

export class Component extends StatementSyntax {
  public type = 'component';

  constructor(
    public tag: string,
    public attrs: string[],
    public args: Args
  ) {
    super();
  }

  compile(list: CompileInto & SymbolLookup, env: Environment, symbolTable: SymbolTable) {
    let definition = env.getComponentDefinition([this.tag], symbolTable);
    let args = this.args.compile(list as SymbolLookup, env, symbolTable);
    let shadow = this.attrs;

    list.append(new PutComponentDefinitionOpcode(definition));
    list.append(new OpenComponentOpcode(args, shadow));
    list.append(new CloseComponentOpcode());
  }
}

export class OpenPrimitiveElement extends StatementSyntax {
  type = "open-primitive-element";

  static build(tag: string): OpenPrimitiveElement {
    return new this(tag);
  }

  constructor(public tag: string) {
    super();
  }

  compile(compiler: CompileInto) {
    compiler.append(new OpenPrimitiveElementOpcode(this.tag));
  }
}

export class Yield extends StatementSyntax {
  static fromSpec(sexp: SerializedStatements.Yield): Yield {
    let [, to, params] = sexp;

    let args = Args.fromSpec(params, null, EMPTY_TEMPLATES);

    return new Yield(to, args);
  }

  static build(params: ExpressionSyntax<Opaque>[], to: string): Yield {
    let args = Args.fromPositionalArgs(PositionalArgs.build(params), EMPTY_TEMPLATES);
    return new this(to, args);
  }

  type = "yield";

  constructor(private to: string, private args: Args) {
    super();
  }

  compile(dsl: OpcodeBuilderDSL, env: Environment, symbolTable: SymbolTable) {
    let { to } = this;
    let args = this.args.compile(dsl, env, symbolTable);

    if (dsl.hasBlockSymbol(to)) {
      let symbol = dsl.getBlockSymbol(to);
      let inner = new CompiledGetBlockBySymbol(symbol, to);
      dsl.append(new OpenBlockOpcode(inner, args));
      dsl.append(new CloseBlockOpcode());
    } else if (dsl.hasPartialArgsSymbol()) {
      let symbol = dsl.getPartialArgsSymbol();
      let inner = new CompiledInPartialGetBlock(symbol, to);
      dsl.append(new OpenBlockOpcode(inner, args));
      dsl.append(new CloseBlockOpcode());
    } else {
      throw new Error('[BUG] ${to} is not a valid block name.');
    }
  }
}

function isStaticPartialName(exp: ExpressionSyntax<Opaque>): exp is Value<any> {
  return exp.type === 'value';
}

export abstract class Partial extends StatementSyntax {
  static fromSpec(sexp: SerializedStatements.Partial): Partial {
    let [, exp] = sexp;

    let name = buildExpression(exp) as ExpressionSyntax<Opaque>;

    if (isStaticPartialName(name)) {
      return new StaticPartialSyntax(name);
    } else {
      return new DynamicPartialSyntax(name);
    }
  }
}

class OpenBlockOpcode extends Opcode {
  type = "open-block";

  constructor(
    private inner: CompiledGetBlock,
    private args: CompiledArgs
  ) {
    super();
  }

  evaluate(vm: VM) {
    let block = this.inner.evaluate(vm);
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

  toJSON(): OpcodeJSON {
    return {
      guid: this._guid,
      type: this.type,
      details: {
        "block": this.inner.toJSON(),
        "positional": this.args.positional.toJSON(),
        "named": this.args.named.toJSON()
      }
    };
  }
}

export class CloseBlockOpcode extends Opcode {
  public type = "close-block";

  evaluate(vm: VM) {
    vm.popScope();
  }
}

export class Value<T extends SerializedExpressions.Value> extends ExpressionSyntax<T> {
  public type = "value";

  static fromSpec<U extends SerializedExpressions.Value>(value: U): Value<U> {
    return new Value(value);
  }

  static build<U extends SerializedExpressions.Value>(value: U): Value<U> {
    return new this(value);
  }

  constructor(public value: T) {
    super();
  }

  inner(): T {
    return this.value;
  }

  compile(compiler: SymbolLookup): CompiledExpression<T> {
    return new CompiledValue<T>(this.value);
  }
}

export class GetArgument extends ExpressionSyntax<Opaque> {
  type = "get-argument";

  static fromSpec(sexp: SerializedExpressions.Arg): GetArgument {
    let [, parts] = sexp;

    return new GetArgument(parts);
  }

  static build(path: string): GetArgument {
    return new this(path.split('.'));
  }

  constructor(public parts: string[]) {
    super();
  }

  compile(lookup: SymbolLookup): CompiledExpression<Opaque> {
    let { parts } = this;
    let head = parts[0];

    if (lookup.hasNamedSymbol(head)) {
      let symbol = lookup.getNamedSymbol(head);
      let path = parts.slice(1);
      let inner = new CompiledSymbol(symbol, head);
      return CompiledLookup.create(inner, path);
    } else if (lookup.hasPartialArgsSymbol()) {
      let symbol = lookup.getPartialArgsSymbol();
      let path = parts.slice(1);
      let inner = new CompiledInPartialName(symbol, head);
      return CompiledLookup.create(inner, path);
    } else {
      throw new Error(`[BUG] @${this.parts.join('.')} is not a valid lookup path.`);
    }
  }
}

// this is separated out from Get because Unknown also has a ref, but it
// may turn out to be a helper
export class Ref extends ExpressionSyntax<Opaque> {
  type = "ref";

  static build(path: string): Ref {
    let parts = path.split('.');

    if (parts[0] === 'this') {
      parts[0] = null;
    }

    return new this(parts);
  }

  constructor(public parts: string[]) {
    super();
  }

  compile(lookup: SymbolLookup): CompiledExpression<Opaque> {
    let { parts } = this;
    let head = parts[0];

    if (head === null) { // {{this.foo}}
      let inner = new CompiledSelf();
      let path = parts.slice(1);
      return CompiledLookup.create(inner, path);
    } else if (lookup.hasLocalSymbol(head)) {
      let symbol = lookup.getLocalSymbol(head);
      let path = parts.slice(1);
      let inner = new CompiledSymbol(symbol, head);
      return CompiledLookup.create(inner, path);
    } else {
      let inner = new CompiledSelf();
      return CompiledLookup.create(inner, parts);
    }
  }
}

export class Get extends ExpressionSyntax<Opaque> {
  type = "get";

  static fromSpec(sexp: SerializedExpressions.Get): Get {
    let [, parts] = sexp;
    return new this(new Ref(parts));
  }

  static build(path: string): Get {
    return new this(Ref.build(path));
  }

  constructor(public ref: Ref) {
    super();
  }

  compile(compiler: SymbolLookup): CompiledExpression<Opaque> {
    return this.ref.compile(compiler);
  }
}

export class Unknown extends ExpressionSyntax<any> {
  public type = "unknown";

  static fromSpec(sexp: SerializedExpressions.Unknown): Unknown {
    let [, path] = sexp;

    return new this(new Ref(path));
  }

  static build(path: string): Unknown {
    return new this(Ref.build(path));
  }

  constructor(public ref: Ref) {
    super();
  }

  compile(compiler: SymbolLookup, env: Environment, symbolTable: SymbolTable): CompiledExpression<Opaque> {
    let { ref } = this;

    if (env.hasHelper(ref.parts, symbolTable)) {
      return new CompiledHelper(ref.parts, env.lookupHelper(ref.parts, symbolTable), CompiledArgs.empty(), symbolTable);
    } else {
      return this.ref.compile(compiler);
    }
  }
}

export class Helper extends ExpressionSyntax<Opaque> {
  type = "helper";

  static fromSpec(sexp: SerializedExpressions.Helper): Helper {
    let [, path, params, hash] = sexp;

    return new Helper(
      new Ref(path),
      Args.fromSpec(params, hash, EMPTY_TEMPLATES)
    );
  }

  static build(path: string, positional: PositionalArgs, named: NamedArgs): Helper {
    return new this(Ref.build(path), Args.build(positional, named, EMPTY_TEMPLATES));
  }

  constructor(public ref: Ref, public args: Args) {
    super();
  }

  compile(compiler: SymbolLookup, env: Environment, symbolTable: SymbolTable): CompiledExpression<Opaque> {
    if (env.hasHelper(this.ref.parts, symbolTable)) {
      let { args, ref } = this;
      return new CompiledHelper(ref.parts, env.lookupHelper(ref.parts, symbolTable), args.compile(compiler, env, symbolTable), symbolTable);
    } else {
      throw new Error(`Compile Error: ${this.ref.parts.join('.')} is not a helper`);
    }
  }
}

export class HasBlock extends ExpressionSyntax<boolean> {
  type = "has-block";

  static fromSpec(sexp: SerializedExpressions.HasBlock): HasBlock {
    let [, blockName] = sexp;
    return new HasBlock(blockName);
  }

  static build(blockName: string): HasBlock {
    return new this(blockName);
  }

  constructor(public blockName: string) {
    super();
  }

  compile(compiler: SymbolLookup, env: Environment): CompiledExpression<boolean> {
    let { blockName } = this;

    if (compiler.hasBlockSymbol(blockName)) {
      let symbol = compiler.getBlockSymbol(blockName);
      let inner = new CompiledGetBlockBySymbol(symbol, blockName);
      return new CompiledHasBlock(inner);
    } else if (compiler.hasPartialArgsSymbol()) {
      let symbol = compiler.getPartialArgsSymbol();
      let inner = new CompiledInPartialGetBlock(symbol, blockName);
      return new CompiledHasBlock(inner);
    } else {
      throw new Error('[BUG] ${blockName} is not a valid block name.');
    }
  }
}

export class HasBlockParams extends ExpressionSyntax<boolean> {
  type = "has-block-params";

  static fromSpec(sexp: SerializedExpressions.HasBlockParams): HasBlockParams {
    let [, blockName] = sexp;
    return new HasBlockParams(blockName);
  }

  static build(blockName: string): HasBlockParams {
    return new this(blockName);
  }

  constructor(public blockName: string) {
    super();
  }

  compile(compiler: SymbolLookup, env: Environment): CompiledExpression<boolean> {
    let { blockName } = this;

    if (compiler.hasBlockSymbol(blockName)) {
      let symbol = compiler.getBlockSymbol(blockName);
      let inner = new CompiledGetBlockBySymbol(symbol, blockName);
      return new CompiledHasBlockParams(inner);
    } else if (compiler.hasPartialArgsSymbol()) {
      let symbol = compiler.getPartialArgsSymbol();
      let inner = new CompiledInPartialGetBlock(symbol, blockName);
      return new CompiledHasBlockParams(inner);
    } else {
      throw new Error('[BUG] ${blockName} is not a valid block name.');
    }
  }
}

export class Concat {
  public type = "concat";

  static fromSpec(sexp: SerializedExpressions.Concat): Concat {
    let [, params] = sexp;

    return new Concat(params.map(buildExpression));
  }

  static build(parts): Concat {
    return new this(parts);
  }

  constructor(public parts: ExpressionSyntax<Opaque>[]) {}

  compile(compiler: SymbolLookup, env: Environment, symbolTable: SymbolTable): CompiledConcat {
    return new CompiledConcat(this.parts.map(p => p.compile(compiler, env, symbolTable)));
  }
}

export class Args {
  public type = "args";

  static empty(): Args {
    return EMPTY_ARGS;
  }

  static fromSpec(positional: SerializedCore.Params, named: SerializedCore.Hash, templates: Templates): Args {
    return new Args(PositionalArgs.fromSpec(positional), NamedArgs.fromSpec(named), templates);
  }

  static fromPositionalArgs(positional: PositionalArgs, templates: Templates): Args {
    return new Args(positional, EMPTY_NAMED_ARGS, templates);
  }

  static fromNamedArgs(named: NamedArgs, templates: Templates): Args {
    return new Args(EMPTY_POSITIONAL_ARGS, named, templates);
  }

  static build(positional: PositionalArgs, named: NamedArgs, templates: Templates): Args {
    if (positional === EMPTY_POSITIONAL_ARGS && named === EMPTY_NAMED_ARGS && templates === EMPTY_TEMPLATES) {
      return EMPTY_ARGS;
    } else {
      return new this(positional, named, templates);
    }
  }

  constructor(
    public positional: PositionalArgs,
    public named: NamedArgs,
    public templates: Templates
  ) {
  }

  compile(compiler: SymbolLookup, env: Environment, symbolTable: SymbolTable): CompiledArgs {
    let { positional, named, templates } = this;
    return CompiledArgs.create(positional.compile(compiler, env, symbolTable), named.compile(compiler, env, symbolTable), templates);
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

  compile(compiler: SymbolLookup, env: Environment, symbolTable: SymbolTable): CompiledPositionalArgs {
    return CompiledPositionalArgs.create(this.values.map(v => v.compile(compiler, env, symbolTable)));
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

  compile(compiler: SymbolLookup, env: Environment, symbolTable: SymbolTable): CompiledNamedArgs {
    let { keys, values } = this;
    return new CompiledNamedArgs(keys, values.map(value => value.compile(compiler, env, symbolTable)));
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
    super(EMPTY_POSITIONAL_ARGS, EMPTY_NAMED_ARGS, EMPTY_TEMPLATES);
  }

  compile(compiler: SymbolLookup, env: Environment): CompiledArgs {
    return CompiledArgs.empty();
  }
});

export class Templates {
  public type = "templates";

  static fromSpec(_default: InlineBlock, inverse: InlineBlock = null): Templates {
    return new Templates(_default, inverse);
  }

  static empty(): Templates {
    return EMPTY_TEMPLATES;
  }

  public default: InlineBlock;
  public inverse: InlineBlock;

  constructor(_default: InlineBlock, inverse: InlineBlock = null) {
    this.default = _default;
    this.inverse = inverse;
  }
}

export const EMPTY_TEMPLATES: Templates = new (class extends Templates {
  constructor() {
    super(null, null);
  }
});
