import * as content from './content';
import * as vm from './vm';

import { Insertion } from '../../upsert';

import * as WireFormat from '@glimmer/wire-format';
import { Option, Stack, Opaque, dict, expect, fillNulls, EMPTY_ARRAY } from '@glimmer/util';
import {
  Constants,
  ConstantString,
  ConstantArray,
  ConstantOther,
  ConstantBlock,
  ConstantFunction,
} from '../../environment/constants';
import { ModifierManager } from '../../modifier/interfaces';
import { ComponentDefinition } from '../../component/interfaces';
import Environment, { Program } from '../../environment';
import { SymbolTable, CompilationMeta } from '@glimmer/interfaces';
import { ComponentBuilder as IComponentBuilder } from '../../opcode-builder';
import { ComponentBuilder } from '../../compiler';
import { RawInlineBlock, ClientSide, Block } from '../../scanner';
import { InvokeDynamicLayout, expr } from '../../syntax/functions';

import { Op } from '../../opcodes';

export interface CompilesInto<E> {
  compile(builder: OpcodeBuilder): E;
}

export type Represents<E> = CompilesInto<E> | E;

export type Label = string;

type TargetOpcode = Op.Jump | Op.JumpIf | Op.JumpUnless;
type RangeOpcode = Op.Enter | Op.EnterList;

class Labels {
  labels = dict<number>();
  jumps: { at: number, target: string, Target: TargetOpcode }[] = [];
  ranges: { at: number, args: number, start: string, end: string, Range: RangeOpcode }[] = [];
  iters: { at: number, breaks: string, start: string, end: string }[] = [];

  label(name: string, index: number) {
    this.labels[name] = index;
  }

  iter(at: number, breaks: string, start: string, end: string) {
    this.iters.push({ at, breaks, start, end });
  }

  jump(at: number, Target: TargetOpcode, target: string) {
    this.jumps.push({ at, target, Target });
  }

  range(at: number, Range: RangeOpcode, args: number, start: string, end: string) {
    this.ranges.push({ at, args, start, end, Range });
  }

  patch(opcodes: Program): void {
    for (let { at, target, Target } of this.jumps) {
      opcodes.set(at, Target, this.labels[target]);
    }

    for (let { at, args, start, end, Range } of this.ranges) {
      opcodes.set(at, Range, args, this.labels[start], this.labels[end] - 4);
    }

    for (let { at, breaks, start, end } of this.iters) {
      opcodes.set(at, Op.Iterate, this.labels[breaks], this.labels[start], this.labels[end] - 4);
    }
  }
}

export abstract class BasicOpcodeBuilder {
  private labelsStack = new Stack<Labels>();
  public constants: Constants;
  public start: number;
  private locals = 0;
  private _localsSize = 0;

  constructor(public env: Environment, public meta: CompilationMeta, public program: Program) {
    this.constants = env.constants;
    this.start = program.next;

    this.reserve(Op.ReserveLocals);
  }

  abstract compile<E>(expr: Represents<E>): E;

  private get pos() {
    return this.program.current;
  }

  private get nextPos() {
    return this.program.next;
  }

  upvars<T extends [Opaque]>(count: number): T {
    return fillNulls(count) as T;
  }

  local(): number {
    let locals = this.locals++;
    if (this._localsSize < this.locals) {
      this._localsSize = this.locals;
    }
    return locals;
  }

  releaseLocal() {
    this.locals--;
  }

  get localsSize() {
    return this._localsSize;
  }

  reserve(name: Op) {
    this.push(name, 0, 0, 0);
  }

  push(name: Op, op1 = 0, op2 = 0, op3 = 0) {
    return this.program.push(name, op1, op2, op3);
  }

  finalize(): number {
    this.program.set(this.start, Op.ReserveLocals, this.localsSize);
    return this.push(Op.ReleaseLocals);
  }

  // args

  pushArgs(positional: number, synthetic: boolean) {
    this.push(Op.PushArgs, positional, (synthetic as any)|0);
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
    label.patch(this.program);
  }

  // components

  pushComponentManager(definition: ComponentDefinition<Opaque>) {
    this.push(Op.PushComponentManager, this.other(definition));
  }

  pushDynamicComponentManager() {
    this.push(Op.PushDynamicComponentManager);
  }

  setComponentState(local: number) {
    this.push(Op.SetComponentState, local);
  }

  prepareArgs(state: number) {
    this.push(Op.PrepareArgs, state);
  }

  createComponent(state: number, hasDefault: boolean, hasInverse: boolean) {
    let flag = (<any>hasDefault|0) | ((<any>hasInverse|0) << 1);
    this.push(Op.CreateComponent, flag, state);
  }

  registerComponentDestructor(state: number) {
    this.push(Op.RegisterComponentDestructor, state);
  }

  beginComponentTransaction() {
    this.push(Op.BeginComponentTransaction);
  }

  commitComponentTransaction() {
    this.push(Op.CommitComponentTransaction);
  }

  pushComponentOperations() {
    this.push(Op.PushComponentOperations);
  }

  getComponentSelf(state: number) {
    this.push(Op.GetComponentSelf, state);
  }

  getComponentLayout(state: number ) {
    this.push(Op.GetComponentLayout, state);
  }

  didCreateElement(state: number) {
    this.push(Op.DidCreateElement, state);
  }

  didRenderLayout(state: number) {
    this.push(Op.DidRenderLayout, state);
  }

  // partial

  getPartialTemplate() {
    this.push(Op.GetPartialTemplate);
  }

  resolveMaybeLocal(name: string) {
    this.push(Op.ResolveMaybeLocal, this.string(name));
  }

  // debugger

  debugger(symbols: string[], evalInfo: number[]) {
    this.push(Op.Debugger, this.constants.other(symbols), this.constants.array(evalInfo));
  }

  // content

  dynamicContent(Opcode: content.AppendDynamicOpcode<Insertion>) {
    this.push(Op.DynamicContent, this.other(Opcode));
  }

  cautiousAppend() {
    this.dynamicContent(new content.OptimizedCautiousAppendOpcode());
  }

  trustingAppend() {
    this.dynamicContent(new content.OptimizedTrustingAppendOpcode());
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
    let value = this.constants.string(_value);

    this.push(Op.StaticAttr, name, value, namespace);
  }

  dynamicAttrNS(_name: string, _namespace: string, trusting: boolean) {
    let name = this.constants.string(_name);
    let namespace = this.constants.string(_namespace);

    this.push(Op.DynamicAttrNS, name, namespace, (trusting as any)|0);
  }

  dynamicAttr(_name: string, trusting: boolean) {
    let name = this.constants.string(_name);
    this.push(Op.DynamicAttr, name, (trusting as any)|0);
  }

  comment(_comment: string) {
    let comment = this.constants.string(_comment);
    this.push(Op.Comment, comment);
  }

  modifier(_definition: ModifierManager<Opaque>) {
    this.push(Op.Modifier, this.other(_definition));
  }

  // lists

  putIterator() {
    this.push(Op.PutIterator);
  }

  enterList(start: string, end: string) {
    this.reserve(Op.EnterList);
    this.labels.range(this.pos, Op.EnterList, 0, start, end);
  }

  exitList() {
    this.push(Op.ExitList);
  }

  iterate(breaks: string, start: string, end: string) {
    this.reserve(Op.Iterate);
    this.labels.iter(this.pos, breaks, start, end);
  }

  // expressions

  setVariable(symbol: number) {
    this.push(Op.SetVariable, symbol);
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

  function(f: ClientSide.FunctionExpressionCallback<Opaque>) {
    this.push(Op.Function, this.func(f));
  }

  setLocal(pos: number) {
    this.push(Op.SetLocal, pos);
  }

  getLocal(pos: number) {
    this.push(Op.GetLocal, pos);
  }

  dup() {
    return this.push(Op.Dup);
  }

  pop() {
    return this.push(Op.Pop);
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
    this.push(Op.RootScope, symbols, <any>bindCallerScope|0);
  }

  pushChildScope() {
    this.push(Op.ChildScope);
  }

  popScope() {
    this.push(Op.PopScope);
  }

  pushDynamicScope() {
    this.push(Op.PushDynamicScope);
  }

  popDynamicScope() {
    this.push(Op.PopDynamicScope);
  }

  pushImmediate<T>(value: T) {
    this.push(Op.Constant, this.other(value));
  }

  primitive(_primitive: string | number | null | undefined | boolean) {
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

  helper(func: Function) {
    this.push(Op.Helper, this.func(func));
  }

  pushBlock(block: Option<Block>) {
    this.push(Op.PushBlock, this.block(block));
  }

  pushBlocks(_default: Option<Block>, inverse: Option<Block>) {
    let flag = 0;
    let defaultBlock: ConstantBlock = 0;
    let inverseBlock: ConstantBlock = 0;

    if (_default) {
      flag |= 0b01;
      defaultBlock = this.block(_default);
    }

    if (inverse) {
      flag |= 0b10;
      inverseBlock = this.block(inverse);
    }

    this.push(Op.PushBlocks, defaultBlock, inverseBlock, flag);
  }

  bindDynamicScope(_names: string[]) {
    this.push(Op.BindDynamicScope, this.names(_names));
  }

  enter(args: number, enter: string, exit: string) {
    this.reserve(Op.Enter);
    this.labels.range(this.pos, Op.Enter, args, enter, exit);
  }

  exit() {
    this.push(Op.Exit);
  }

  compileDynamicBlock(): void {
    this.push(Op.CompileDynamicBlock);
  }

  invokeDynamic(invoker: vm.DynamicInvoker<SymbolTable>): void {
    this.push(Op.InvokeDynamic, this.other(invoker));
  }

  invokeStatic(_block: Block, ...args: ((builder: BasicOpcodeBuilder) => void)[]): void;
  invokeStatic(_block: Block, numArgs: number): void;
  invokeStatic(_block: Block): void {
    let { parameters } = _block.symbolTable;
    let paramSize = parameters.length;
    let argSize = arguments.length - 1;
    let onStack = false;
    let excess = 0;

    if (argSize === 1 && typeof arguments[1] === 'number') {
      argSize = Math.min(paramSize, arguments[1]);
      excess = Math.max(arguments[1] - paramSize, 0);
      onStack = true;
    } else {
      argSize = Math.min(paramSize, argSize);
    }

    for (let i=0; i<excess; i++) {
      this.pop();
    }

    if (argSize) {
      this.pushChildScope();

      for (let i=argSize-1; i>=0; i--) {
        if (!onStack) {
          arguments[i+1](this);
        }
        this.setVariable(parameters[i]);
      }
    }

    let block = this.constants.block(_block);
    this.push(Op.InvokeStatic, block);

    if (argSize) {
      this.popScope();
    }
  }

  test(testFunc: 'const' | 'simple' | 'environment' | vm.TestFunction) {
    let _func: vm.TestFunction;

    if (testFunc === 'const') {
      _func = vm.ConstTest;
    } else if (testFunc === 'simple') {
      _func = vm.SimpleTest;
    } else if (testFunc === 'environment') {
      _func = vm.EnvironmentTest;
    } else if (typeof testFunc === 'function') {
      _func = testFunc;
    } else {
      throw new Error('unreachable');
    }

    let func = this.constants.function(_func);
    this.push(Op.Test, func);
  }

  jump(target: string) {
    this.reserve(Op.Jump);
    this.labels.jump(this.pos, Op.Jump, target);
  }

  jumpIf(target: string) {
    this.reserve(Op.JumpIf);
    this.labels.jump(this.pos, Op.JumpIf, target);
  }

  jumpUnless(target: string) {
    this.reserve(Op.JumpUnless);
    this.labels.jump(this.pos, Op.JumpUnless, target);
  }

  string(_string: string): ConstantString {
    return this.constants.string(_string);
  }

  protected names(_names: string[]): ConstantArray {
    let names = _names.map(n => this.constants.string(n));
    return this.constants.array(names);
  }

  protected symbols(symbols: number[]): ConstantArray {
    return this.constants.array(symbols);
  }

  protected other(value: Opaque): ConstantOther {
    return this.constants.other(value);
  }

  protected block(block: Option<Block>): ConstantBlock {
    return block ? this.constants.block(block) : 0;
  }

  protected func(func: Function): ConstantFunction {
    return this.constants.function(func);
  }
}

function isCompilableExpression<E>(expr: Represents<E>): expr is CompilesInto<E> {
  return expr && typeof expr['compile'] === 'function';
}

export default class OpcodeBuilder extends BasicOpcodeBuilder {
  public component: IComponentBuilder;

  constructor(env: Environment, meta: CompilationMeta, program: Program = env.program) {
    super(env, meta, program);
    this.component = new ComponentBuilder(this);
  }

  compileArgs(params: Option<WireFormat.Core.Params>, hash: Option<WireFormat.Core.Hash>, synthetic: boolean) {
    let positional = 0;

    if (params) {
      params.forEach(p => expr(p, this));
      positional = params.length;
    }

    let names = EMPTY_ARRAY;

    if (hash) {
      names = hash[0];
      hash[1].forEach(v => expr(v, this));
    }

    this.pushImmediate(names);
    this.pushArgs(positional, synthetic);
  }

  compile<E>(expr: Represents<E>): E {
    if (isCompilableExpression(expr)) {
      return expr.compile(this);
    } else {
      return expr;
    }
  }

  guardedCautiousAppend(expression: WireFormat.Expression) {
    expr(expression, this);
    this.dynamicContent(new content.GuardedCautiousAppendOpcode());
  }

  guardedTrustingAppend(expression: WireFormat.Expression) {
    expr(expression, this);
    this.dynamicContent(new content.GuardedTrustingAppendOpcode());
  }

  invokeComponent(attrs: Option<RawInlineBlock>, params: Option<WireFormat.Core.Params>, hash: Option<WireFormat.Core.Hash>, block: Option<Block>, inverse: Option<Block> = null) {
    let state = this.local();

    this.setComponentState(state);

    this.pushBlock(block);
    this.pushBlock(inverse);

    this.compileArgs(params, hash, false);
    this.prepareArgs(state);

    this.pushDynamicScope();

    this.createComponent(state, true, false);
    this.registerComponentDestructor(state);
    this.beginComponentTransaction();

    this.getComponentSelf(state);
    this.getComponentLayout(state);
    this.invokeDynamic(new InvokeDynamicLayout(attrs && attrs.scan()));
    this.didCreateElement(state);

    this.didRenderLayout(state);
    this.popScope();
    this.popDynamicScope();
    this.commitComponentTransaction();

    this.releaseLocal();
  }

  template(block: Option<WireFormat.SerializedInlineBlock>): Option<RawInlineBlock> {
    if (!block) return null;
    return new RawInlineBlock(this.env, this.meta, block.statements, block.parameters);
  }

  // TODO
  // come back to this
  closure(args: number, callback: BlockCallback) {
    this.startLabels();
    this.enter(args, 'BEGIN', 'END');
    this.label('BEGIN');

    callback(this, 'BEGIN', 'END');

    this.label('END');
    this.exit();
    this.stopLabels();
  }

  // TODO
  // come back to this
  iter(callback: BlockCallback) {
    this.startLabels();
    this.enterList('BEGIN', 'END');
    this.label('ITER');
    this.iterate('BREAK', 'BEGIN', 'END');
    this.label('BEGIN');

    callback(this, 'BEGIN', 'END');

    this.label('END');
    this.exit();
    this.jump('ITER');
    this.label('BREAK');
    this.exitList();
    this.stopLabels();
  }

  // TODO
  // come back to this
  unit(callback: (builder: OpcodeBuilder) => void) {
    this.startLabels();
    callback(this);
    this.stopLabels();
  }
}

export type BlockCallback = (dsl: OpcodeBuilder, BEGIN: Label, END: Label) => void;
