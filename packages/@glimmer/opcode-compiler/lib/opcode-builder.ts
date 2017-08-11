import { Opaque, Option, ProgramSymbolTable, SymbolTable } from '@glimmer/interfaces';
import { dict, EMPTY_ARRAY, expect, fillNulls, Stack, typePos, unreachable } from '@glimmer/util';
import { Op, Register } from '@glimmer/vm';
import * as WireFormat from '@glimmer/wire-format';
import { TemplateMeta, SerializedInlineBlock } from "@glimmer/wire-format";

import {
  VMHandle as VMHandle,
  CompileTimeHeap,
  CompileTimeLazyConstants,
  Primitive,
  CompilableBlock,
  CompileTimeConstants,
  CompileTimeProgram,
  ComponentCapabilities,
  ParsedLayout
} from './interfaces';

import {
  ATTRS_BLOCK,
  Macros,
  expr
} from './syntax';

import CompilableTemplate, { ICompilableTemplate } from './compilable-template';

import {
  ComponentBuilder
} from './wrapped-component';

export type Label = string;

type TargetOpcode = Op.Jump | Op.JumpIf | Op.JumpUnless | Op.EnterList | Op.Iterate | Op.ReturnTo;

class Labels {
  labels = dict<number>();
  targets: Array<{ at: number, Target: TargetOpcode, target: string }> = [];

  label(name: string, index: number) {
    this.labels[name] = index;
  }

  target(at: number, Target: TargetOpcode, target: string) {
    this.targets.push({ at, Target, target });
  }

  patch(buffer: number[]): void {
    let { targets, labels } = this;
    for (let i = 0; i < targets.length; i++) {
      let { at, target } = targets[i];
      let address = labels[target] - at;
      buffer[at + 1] = address;
    }
  }
}

export interface AbstractTemplate<S extends SymbolTable = SymbolTable> {
  symbolTable: S;
}

export interface CompileTimeLookup<Specifier> {
  getCapabilities(handle: number): ComponentCapabilities;
  getLayout(handle: number): Option<ICompilableTemplate<ProgramSymbolTable>>;

  // This interface produces specifiers (and indicates if a name is present), but does not
  // produce any actual objects. The main use-case for producing objects is handled above,
  // with getCapabilities and getLayout, which drastically shrinks the size of the object
  // that the core interface is forced to reify.
  lookupHelper(name: string, referer: Specifier): Option<number>;
  lookupModifier(name: string, referer: Specifier): Option<number>;
  lookupComponentSpec(name: string, referer: Specifier): Option<number>;
  lookupPartial(name: string, referer: Specifier): Option<number>;
}

export interface OpcodeBuilderConstructor<Specifier> {
  new(program: CompileTimeProgram,
      lookup: CompileTimeLookup<Specifier>,
      meta: TemplateMeta,
      macros: Macros,
      containingLayout: ParsedLayout,
      asPartial: boolean,
      Builder: OpcodeBuilderConstructor<Specifier>): OpcodeBuilder<Specifier>;
}

export abstract class OpcodeBuilder<Specifier, Layout extends AbstractTemplate<ProgramSymbolTable> = AbstractTemplate<ProgramSymbolTable>> {
  public constants: CompileTimeConstants;

  private buffer: number[] = [];
  private labelsStack = new Stack<Labels>();
  private isComponentAttrs = false;
  public component: ComponentBuilder<Specifier> = new ComponentBuilder(this);

  constructor(
    public program: CompileTimeProgram,
    public lookup: CompileTimeLookup<Specifier>,
    public meta: TemplateMeta,
    public macros: Macros,
    public containingLayout: ParsedLayout,
    public asPartial: boolean,
    public Builder: OpcodeBuilderConstructor<Specifier>
  ) {
    this.constants = program.constants;
  }

  private get pos(): number {
    return typePos(this.buffer.length);
  }

  private get nextPos(): number {
    return this.buffer.length;
  }

  upvars<T extends [Opaque]>(count: number): T {
    return fillNulls(count) as T;
  }

  reserve(name: Op) {
    this.push(name, 0, 0, 0);
  }

  push(name: Op, op1 = 0, op2 = 0, op3 = 0) {
    let { buffer } = this;
    buffer.push(name);
    buffer.push(op1);
    buffer.push(op2);
    buffer.push(op3);
  }

  commit(heap: CompileTimeHeap): VMHandle {
    this.push(Op.Return);

    let { buffer } = this;

    // TODO: change the whole malloc API and do something more efficient
    let handle = heap.malloc();

    for (let i = 0; i < buffer.length; i++) {
      heap.push(buffer[i]);
    }

    heap.finishMalloc(handle);

    return handle;
  }

  setComponentAttrs(enabled: boolean): void {
    this.isComponentAttrs = enabled;
  }

  // args

  pushArgs(names: string[], positionalCount: number, synthetic: boolean) {
    let serialized = this.constants.stringArray(names);
    this.push(Op.PushArgs, serialized, positionalCount, synthetic === true ? 1 : 0);
  }

  // helpers

  private get labels(): Labels {
    return expect(this.labelsStack.current, 'bug: not in a label stack');
  }

  startLabels() {
    this.labelsStack.push(new Labels());
  }

  stopLabels() {
    let label = expect(this.labelsStack.pop(), 'unbalanced push and pop labels');
    label.patch(this.buffer);
  }

  // components

  pushComponentSpec(handle: number) {
    this.push(Op.PushComponentSpec, this.constants.handle(handle));
  }

  pushDynamicComponentManager(meta: TemplateMeta) {
    this.push(Op.PushDynamicComponentManager, this.constants.serializable(meta));
  }

  prepareArgs(state: Register) {
    this.push(Op.PrepareArgs, state);
  }

  createComponent(state: Register, hasDefault: boolean, hasInverse: boolean) {
    let flag = (hasDefault === true ? 1 : 0) | ((hasInverse === true ? 1 : 0) << 1);
    this.push(Op.CreateComponent, flag, state);
  }

  registerComponentDestructor(state: Register) {
    this.push(Op.RegisterComponentDestructor, state);
  }

  beginComponentTransaction() {
    this.push(Op.BeginComponentTransaction);
  }

  commitComponentTransaction() {
    this.push(Op.CommitComponentTransaction);
  }

  putComponentOperations() {
    this.push(Op.PutComponentOperations);
  }

  getComponentSelf(state: Register) {
    this.push(Op.GetComponentSelf, state);
  }

  getComponentTagName(state: Register) {
    this.push(Op.GetComponentTagName, state);
  }

  getComponentLayout(state: Register) {
    this.push(Op.GetComponentLayout, state);
  }

  invokeComponentLayout() {
    this.push(Op.InvokeComponentLayout);
  }

  didCreateElement(state: Register) {
    this.push(Op.DidCreateElement, state);
  }

  didRenderLayout(state: Register) {
    this.push(Op.DidRenderLayout, state);
  }

  // partial

  invokePartial(meta: TemplateMeta, symbols: string[], evalInfo: number[]) {
    let _meta = this.constants.serializable(meta);
    let _symbols = this.constants.stringArray(symbols);
    let _evalInfo = this.constants.array(evalInfo);

    this.push(Op.InvokePartial, _meta, _symbols, _evalInfo);
  }

  resolveMaybeLocal(name: string) {
    this.push(Op.ResolveMaybeLocal, this.string(name));
  }

  // debugger

  debugger(symbols: string[], evalInfo: number[]) {
    this.push(Op.Debugger, this.constants.stringArray(symbols), this.constants.array(evalInfo));
  }

  // content

  dynamicContent(isTrusting: boolean) {
    this.push(Op.DynamicContent, isTrusting ? 1 : 0);
  }

  // dom

  text(text: string) {
    this.push(Op.Text, this.constants.string(text));
  }

  openPrimitiveElement(tag: string) {
    this.push(Op.OpenElement, this.constants.string(tag));
  }

  openElementWithOperations(tag: string) {
    this.push(Op.OpenElementWithOperations, this.constants.string(tag));
  }

  openDynamicElement() {
    this.push(Op.OpenDynamicElement);
  }

  flushElement() {
    this.push(Op.FlushElement);
  }

  closeElement() {
    this.push(Op.CloseElement);
  }

  staticAttr(_name: string, _namespace: Option<string>, _value: string) {
    let name = this.constants.string(_name);
    let namespace = _namespace ? this.constants.string(_namespace) : 0;

    if (this.isComponentAttrs) {
      this.pushPrimitiveReference(_value);
      this.push(Op.ComponentAttr, name, 1, namespace);
    } else {
      let value = this.constants.string(_value);
      this.push(Op.StaticAttr, name, value, namespace);
    }
  }

  dynamicAttr(_name: string, _namespace: Option<string>, trusting: boolean) {
    let name = this.constants.string(_name);
    let namespace = _namespace ? this.constants.string(_namespace) : 0;

    if (this.isComponentAttrs) {
      this.push(Op.ComponentAttr, name, (trusting === true ? 1 : 0), namespace);
    } else {
      this.push(Op.DynamicAttr, name, (trusting === true ? 1 : 0), namespace);
    }
  }

  comment(_comment: string) {
    let comment = this.constants.string(_comment);
    this.push(Op.Comment, comment);
  }

  modifier(specifier: Specifier) {
    this.push(Op.Modifier, this.constants.handle(specifier));
  }

  // lists

  putIterator() {
    this.push(Op.PutIterator);
  }

  enterList(start: string) {
    this.reserve(Op.EnterList);
    this.labels.target(this.pos, Op.EnterList, start);
  }

  exitList() {
    this.push(Op.ExitList);
  }

  iterate(breaks: string) {
    this.reserve(Op.Iterate);
    this.labels.target(this.pos, Op.Iterate, breaks);
  }

  // expressions

  setVariable(symbol: number) {
    this.push(Op.SetVariable, symbol);
  }

  setBlock(symbol: number) {
    this.push(Op.SetBlock, symbol);
  }

  getVariable(symbol: number) {
    this.push(Op.GetVariable, symbol);
  }

  getProperty(key: string) {
    this.push(Op.GetProperty, this.string(key));
  }

  getBlock(symbol: number) {
    this.push(Op.GetBlock, symbol);
  }

  hasBlock(symbol: number) {
    this.push(Op.HasBlock, symbol);
  }

  hasBlockParams(symbol: number) {
    this.push(Op.HasBlockParams, symbol);
  }

  concat(size: number) {
    this.push(Op.Concat, size);
  }

  load(register: Register) {
    this.push(Op.Load, register);
  }

  fetch(register: Register) {
    this.push(Op.Fetch, register);
  }

  dup(register = Register.sp, offset = 0) {
    return this.push(Op.Dup, register, offset);
  }

  pop(count = 1) {
    return this.push(Op.Pop, count);
  }

  // vm

  pushRemoteElement() {
    this.push(Op.PushRemoteElement);
  }

  popRemoteElement() {
    this.push(Op.PopRemoteElement);
  }

  label(name: string) {
    this.labels.label(name, this.nextPos);
  }

  pushRootScope(symbols: number, bindCallerScope: boolean) {
    this.push(Op.RootScope, symbols, (bindCallerScope ? 1 : 0));
  }

  pushChildScope() {
    this.push(Op.ChildScope);
  }

  popScope() {
    this.push(Op.PopScope);
  }

  returnTo(label: string) {
    this.reserve(Op.ReturnTo);
    this.labels.target(this.pos, Op.ReturnTo, label);
  }

  pushDynamicScope() {
    this.push(Op.PushDynamicScope);
  }

  popDynamicScope() {
    this.push(Op.PopDynamicScope);
  }

  primitive(_primitive: Primitive) {
    let flag: 0 | 1 | 2 = 0;
    let primitive: number;
    switch (typeof _primitive) {
      case 'number':
        primitive = _primitive as number;
        break;
      case 'string':
        primitive = this.string(_primitive as string);
        flag = 1;
        break;
      case 'boolean':
        primitive = (_primitive as any) | 0;
        flag = 2;
        break;
      case 'object':
        // assume null
        primitive = 2;
        flag = 2;
        break;
      case 'undefined':
        primitive = 3;
        flag = 2;
        break;
      default:
        throw new Error('Invalid primitive passed to pushPrimitive');
    }

    this.push(Op.Primitive, (flag << 30) | primitive);
  }

  pushPrimitiveReference(primitive: Primitive) {
    this.primitive(primitive);
    this.primitiveReference();
  }

  primitiveReference() {
    this.push(Op.PrimitiveReference);
  }

  helper(helper: Specifier) {
    this.push(Op.Helper, this.constants.handle(helper));
  }

  bindDynamicScope(_names: string[]) {
    this.push(Op.BindDynamicScope, this.names(_names));
  }

  enter(args: number) {
    this.push(Op.Enter, args);
  }

  exit() {
    this.push(Op.Exit);
  }

  return() {
    this.push(Op.Return);
  }

  pushFrame() {
    this.push(Op.PushFrame);
  }

  popFrame() {
    this.push(Op.PopFrame);
  }

  invokeStatic(): void {
    this.push(Op.InvokeStatic);
  }

  invokeYield(): void {
    this.push(Op.InvokeYield);
  }

  toBoolean() {
    this.push(Op.ToBoolean);
  }

  jump(target: string) {
    this.reserve(Op.Jump);
    this.labels.target(this.pos, Op.Jump, target);
  }

  jumpIf(target: string) {
    this.reserve(Op.JumpIf);
    this.labels.target(this.pos, Op.JumpIf, target);
  }

  jumpUnless(target: string) {
    this.reserve(Op.JumpUnless);
    this.labels.target(this.pos, Op.JumpUnless, target);
  }

  // internal helpers

  string(_string: string): number {
    return this.constants.string(_string);
  }

  protected names(_names: string[]): number {
    let names: number[] = [];

    for (let i = 0; i < _names.length; i++) {
      let n = _names[i];
      names[i]= this.constants.string(n);
    }

    return this.constants.array(names);
  }

  protected symbols(symbols: number[]): number {
    return this.constants.array(symbols);
  }

  // convenience methods

  inlineBlock(block: SerializedInlineBlock): CompilableBlock {
    let { parameters, statements } = block;
    let symbolTable = { parameters, meta: this.containingLayout.meta };
    return new CompilableTemplate(statements, this.containingLayout, this, symbolTable);
  }

  evalSymbols(): Option<string[]> {
    let { containingLayout: { block } } = this;

    return block.hasEval ? block.symbols : null;
  }

  compileParams(params: Option<WireFormat.Core.Params>) {
    if (!params) return 0;

    for (let i = 0; i < params.length; i++) {
      expr(params[i], this);
    }

    return params.length;
  }

  compileArgs(params: Option<WireFormat.Core.Params>, hash: Option<WireFormat.Core.Hash>, synthetic: boolean) {
    let count = this.compileParams(params);

    let names: string[] = EMPTY_ARRAY;

    if (hash) {
      names = hash[0];
      let val = hash[1];
      for (let i = 0; i < val.length; i++) {
        expr(val[i], this);
      }
    }

    this.pushArgs(names, count, synthetic);
  }

  invokeStaticBlock(block: CompilableBlock, callerCount = 0): void {
    let { parameters } = block.symbolTable;
    let calleeCount = parameters.length;
    let count = Math.min(callerCount, calleeCount);

    this.pushFrame();

    if (count) {
      this.pushChildScope();

      for (let i = 0; i < count; i++) {
        this.dup(Register.fp, callerCount - i);
        this.setVariable(parameters[i]);
      }
    }

    this.pushBlock(block);
    this.resolveBlock();
    this.invokeStatic();

    if (count) {
      this.popScope();
    }

    this.popFrame();
  }

  guardedAppend(expression: WireFormat.Expression, trusting: boolean) {
    this.startLabels();

    this.pushFrame();

    this.returnTo('END');

    expr(expression, this);

    this.dup();
    this.isComponent();

    this.enter(2);

    this.jumpUnless('ELSE');

    this.pushDynamicComponentManager(this.meta);
    this.invokeComponent(null, null, null, false, null, null);

    this.exit();

    this.return();

    this.label('ELSE');

    this.dynamicContent(trusting);

    this.exit();

    this.return();

    this.label('END');

    this.popFrame();

    this.stopLabels();
  }

  yield(to: number, params: Option<WireFormat.Core.Params>) {
    this.compileArgs(params, null, false);
    this.getBlock(to);
    this.resolveBlock();
    this.invokeYield();
    this.popScope();
    this.popFrame();
  }

  invokeComponent(attrs: Option<CompilableBlock>, params: Option<WireFormat.Core.Params>, hash: WireFormat.Core.Hash, synthetic: boolean, block: Option<CompilableBlock>, inverse: Option<CompilableBlock> = null) {
    this.fetch(Register.s0);
    this.dup(Register.sp, 1);
    this.load(Register.s0);

    this.pushYieldableBlock(block);
    this.pushYieldableBlock(inverse);
    this.pushYieldableBlock(attrs);

    this.compileArgs(params, hash, synthetic);
    this.prepareArgs(Register.s0);

    this.beginComponentTransaction();
    this.pushDynamicScope();
    this.createComponent(Register.s0, block !== null, inverse !== null);
    this.registerComponentDestructor(Register.s0);

    this.getComponentSelf(Register.s0);

    this.getComponentLayout(Register.s0);
    this.resolveLayout();
    this.invokeComponentLayout();
    this.didRenderLayout(Register.s0);
    this.popFrame();

    this.popScope();
    this.popDynamicScope();
    this.commitComponentTransaction();

    this.load(Register.s0);
  }

  invokeStaticComponent(capabilities: ComponentCapabilities, layout: Layout, attrs: Option<CompilableBlock>, params: Option<WireFormat.Core.Params>, hash: WireFormat.Core.Hash, synthetic: boolean, block: Option<CompilableBlock>, inverse: Option<CompilableBlock> = null) {
    let { symbolTable } = layout;

    let bailOut =
      symbolTable.hasEval ||
      capabilities.prepareArgs ||
      capabilities.createArgs;

    if (bailOut) {
      this.invokeComponent(attrs, params, hash, synthetic, block, inverse);
      return;
    }

    this.fetch(Register.s0);
    this.dup(Register.sp, 1);
    this.load(Register.s0);

    let { symbols } = symbolTable;

    this.beginComponentTransaction();
    this.pushDynamicScope();
    this.createComponent(Register.s0, block !== null, inverse !== null);
    this.registerComponentDestructor(Register.s0);

    let bindings: { symbol: number, isBlock: boolean }[] = [];

    this.getComponentSelf(Register.s0);
    bindings.push({ symbol: 0, isBlock: false });

    for (let i = 0; i < symbols.length; i++) {
      let symbol = symbols[i];

      switch (symbol.charAt(0)) {
        case '&':
          let callerBlock: Option<CompilableBlock> = null;

          if (symbol === '&default') {
            callerBlock = block;
          } else if (symbol === '&inverse') {
            callerBlock = inverse;
          } else if (symbol === ATTRS_BLOCK) {
            callerBlock = attrs;
          } else {
            throw unreachable();
          }

          if (callerBlock) {
            this.pushYieldableBlock(callerBlock);
            bindings.push({ symbol: i + 1, isBlock: true });
          } else {
            this.primitive(null);
            bindings.push({ symbol: i + 1, isBlock: false });
          }

          break;

        case '@':
          if (!hash) {
            break;
          }

          let [keys, values] = hash;
          let lookupName = symbol;

          if (synthetic) {
            lookupName = symbol.slice(1);
          }

          let index = keys.indexOf(lookupName);

          if (index !== -1) {
            expr(values[index], this);
            bindings.push({ symbol: i + 1, isBlock: false });
          }

          break;
      }
    }

    this.pushRootScope(symbols.length + 1, !!(block || inverse || attrs));

    for (let i = bindings.length - 1; i >= 0; i--) {
      let { symbol, isBlock } = bindings[i];

      if (isBlock) {
        this.setBlock(symbol);
      } else {
        this.setVariable(symbol);
      }
    }

    this.pushFrame();

    this.pushSymbolTable(layout.symbolTable);
    this.pushLayout(layout);
    this.resolveLayout();
    this.invokeStatic();
    this.didRenderLayout(Register.s0);
    this.popFrame();

    this.popScope();
    this.popDynamicScope();
    this.commitComponentTransaction();

    this.load(Register.s0);
  }

  dynamicComponent(definition: WireFormat.Expression, /* TODO: attrs: Option<RawInlineBlock>, */ params: Option<WireFormat.Core.Params>, hash: WireFormat.Core.Hash, synthetic: boolean, block: Option<CompilableBlock>, inverse: Option<CompilableBlock> = null) {
    this.startLabels();

    this.pushFrame();

    this.returnTo('END');

    expr(definition, this);

    this.dup();

    this.enter(2);

    this.jumpUnless('ELSE');

    this.pushDynamicComponentManager(this.meta);
    this.invokeComponent(null, params, hash, synthetic, block, inverse);

    this.label('ELSE');
    this.exit();
    this.return();

    this.label('END');
    this.popFrame();

    this.stopLabels();
  }

  isComponent() {
    this.push(Op.IsComponent);
  }

  curryComponent(definition: WireFormat.Expression, /* TODO: attrs: Option<RawInlineBlock>, */ params: Option<WireFormat.Core.Params>, hash: WireFormat.Core.Hash, synthetic: boolean) {
    let meta = this.meta.templateMeta;

    expr(definition, this);
    this.compileArgs(params, hash, synthetic);
    this.push(Op.CurryComponent, this.constants.serializable(meta));
  }

  abstract pushBlock(block: Option<CompilableBlock>): void;
  abstract resolveBlock(): void;
  abstract pushLayout(layout: Option<Layout>): void;
  abstract resolveLayout(): void;
  abstract pushSymbolTable(block: Option<SymbolTable>): void;

  pushYieldableBlock(block: Option<CompilableBlock>): void {
    this.pushSymbolTable(block && block.symbolTable);
    this.pushBlock(block);
  }

  template(block: Option<WireFormat.SerializedInlineBlock>): Option<CompilableBlock> {
    if (!block) return null;

    return this.inlineBlock(block);
  }
}

export default OpcodeBuilder;

export class LazyOpcodeBuilder<Specifier> extends OpcodeBuilder<Specifier, CompilableTemplate<ProgramSymbolTable, Specifier>> {
  public constants: CompileTimeLazyConstants;

  pushSymbolTable(symbolTable: Option<SymbolTable>) {
    if (symbolTable) {
      this.pushOther(symbolTable);
    } else {
      this.primitive(null);
    }
  }

  pushBlock(block: Option<CompilableBlock>): void {
    if (block) {
      this.pushOther(block);
    } else {
      this.primitive(null);
    }
  }

  resolveBlock(): void {
    this.push(Op.CompileBlock);
  }

  pushLayout(layout: Option<CompilableTemplate<ProgramSymbolTable, Specifier>>) {
    if (layout) {
      this.pushOther(layout);
    } else {
      this.primitive(null);
    }
  }

  resolveLayout(): void {
    this.push(Op.CompileBlock);
  }

  protected pushOther<T>(value: T) {
    this.push(Op.Constant, this.other(value));
  }

  protected other(value: Opaque): number {
    return this.constants.other(value);
  }
}

// export class EagerOpcodeBuilder extends OpcodeBuilder {
// }
