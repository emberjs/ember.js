import * as content from './content';
import * as vm from './vm';

import { Insertion } from '../../upsert';

import { Option, Stack, Dict, Opaque, dict, expect, fillNulls } from '@glimmer/util';
import { Constants } from '../../opcodes';
import { CompiledArgs } from '../expressions/args';
import { ComponentDefinition } from '../../component/interfaces';
import { PartialDefinition } from '../../partial';
import Environment, { Program } from '../../environment';
import { SymbolTable } from '@glimmer/interfaces';
import { ComponentBuilder as IComponentBuilder } from '../../opcode-builder';
import { ComponentBuilder } from '../../compiler';
import { BaselineSyntax, Block, Program as Layout } from '../../scanner';
import { compileList } from '../../syntax/functions';

import {
  ConstantString,
  ConstantArray,
  ConstantOther,
  ConstantBlock,
  ConstantFunction,
  Op
} from '../../opcodes';

export interface CompilesInto<E> {
  compile(builder: OpcodeBuilder): E;
}

export type Represents<E> = CompilesInto<E> | E;

export type Label = string;

export interface SymbolLookup {
  symbolTable: SymbolTable;
}

type TargetOpcode = Op.Jump | Op.JumpIf | Op.JumpUnless;
type RangeOpcode = Op.Enter | Op.EnterList;

class Labels {
  labels = dict<number>();
  jumps: { at: number, target: string, Target: TargetOpcode }[] = [];
  ranges: { at: number, start: string, end: string, Range: RangeOpcode }[] = [];
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

  range(at: number, Range: RangeOpcode, start: string, end: string) {
    this.ranges.push({ at, start, end, Range });
  }

  patch(opcodes: Program): void {
    for (let { at, target, Target } of this.jumps) {
      opcodes.set(at, Target, this.labels[target]);
    }

    for (let { at, start, end, Range } of this.ranges) {
      opcodes.set(at, Range, this.labels[start], this.labels[end] - 4);
    }

    for (let { at, breaks, start, end } of this.iters) {
      opcodes.set(at, Op.Iterate, this.labels[breaks], this.labels[start], this.labels[end] - 4);
    }
  }
}

// const HI = 0x80000000;
// const HI_MASK = 0x7FFFFFFF;
// const HI2 = 0x40000000;
// const HI2_MASK = 0xbFFFFFFF;

export abstract class BasicOpcodeBuilder implements SymbolLookup {
  private labelsStack = new Stack<Labels>();
  public constants: Constants;
  public start: number;
  private locals = 0;
  private _localsSize = 0;

  constructor(public symbolTable: SymbolTable, public env: Environment, public program: Program) {
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
    this.push(name);
  }

  push(name: Op, op1 = 0, op2 = 0, op3 = 0) {
    return this.program.push(name, op1, op2, op3);
  }

  finalize(): number {
    this.program.set(this.start, Op.ReserveLocals, this.localsSize);
    return this.push(Op.ReleaseLocals);
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

  // partials

  putPartialDefinition(_definition: PartialDefinition<Opaque>) {
    let definition = this.constants.other(_definition);
    this.push(Op.PutPartial, definition);
  }

  putDynamicPartialDefinition() {
    this.push(Op.PutDynamicPartial, this.constants.other(this.symbolTable));
  }

  evaluatePartial() {
    this.push(Op.EvaluatePartial, this.constants.other(this.symbolTable), this.constants.other(dict()));
  }

  // components

  pushComponentManager(definition: ComponentDefinition<Opaque>) {
    this.push(Op.PushComponentManager, this.other(definition));
  }

  pushDynamicComponentManager(local: number) {
    this.push(Op.PushDynamicComponentManager, local);
  }

  setComponentState(local: number) {
    this.push(Op.SetComponentState, local);
  }

  pushComponentArgs(positional: number, named: number, namedDict: Dict<number>) {
    this.push(Op.PushComponentArgs, positional, named, this.constants.other(namedDict));
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

  guardedCautiousAppend(expression: BaselineSyntax.AnyExpression) {
    this.dynamicContent(new content.GuardedCautiousAppendOpcode(expression, this.symbolTable));
  }

  guardedTrustingAppend(expression: BaselineSyntax.AnyExpression) {
    this.dynamicContent(new content.GuardedTrustingAppendOpcode(expression, this.symbolTable));
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

  modifier(_name: string, _args: Represents<CompiledArgs>) {
    // let args = this.constants.expression(this.compile(_args));
    // let _modifierManager = this.env.lookupModifier(_name, this.symbolTable);
    // let modifierManager = this.constants.other(_modifierManager);
    // let name = this.constants.string(_name);
    // this.push(Op.Modifier, name, modifierManager, args);
  }

  // lists

  putIterator() {
    this.push(Op.PutIterator);
  }

  enterList(start: string, end: string) {
    this.reserve(Op.EnterList);
    this.labels.range(this.pos, Op.EnterList, start, end);
  }

  exitList() {
    this.push(Op.ExitList);
  }

  iterate(breaks: string, start: string, end: string) {
    this.reserve(Op.Iterate);
    this.labels.iter(this.pos, breaks, start, end);
  }

  // expressions

  self() {
    this.push(Op.Self);
  }

  setVariable(symbol: number) {
    this.push(Op.SetVariable, symbol);
  }

  getVariable(symbol: number) {
    this.push(Op.GetVariable, symbol);
  }

  getProperty(key: string) {
    this.push(Op.GetProperty, this.string(key));
  }

  getBlock(name: string) {
    let symbol = this.symbolTable.getSymbol('yields', name);
    this.push(Op.GetBlock, symbol!);
  }

  hasBlock(name: string) {
    let symbol = this.symbolTable.getSymbol('yields', name);
    this.push(Op.HasBlock, symbol!);
  }

  hasBlockParams(name: string) {
    let symbol = this.symbolTable.getSymbol('yields', name);
    this.push(Op.HasBlockParams, symbol!);
  }

  concat(size: number) {
    this.push(Op.Concat, size);
  }

  function(f: BaselineSyntax.FunctionExpressionCallback<Opaque>) {
    this.push(Op.Function, this.func(f));
  }

  setLocal(pos: number) {
    this.push(Op.SetLocal, pos);
  }

  getLocal(pos: number) {
    this.push(Op.GetLocal, pos);
  }

  pop() {
    return this.push(Op.Pop);
  }

  // vm

  openBlock(positional: number) {
    this.push(Op.InvokeBlock, positional);
  }

  closeBlock() {
    this.push(Op.DoneBlock);
  }

  pushRemoteElement() {
    this.push(Op.PushRemoteElement);
  }

  popRemoteElement() {
    this.push(Op.PopRemoteElement);
  }

  label(name: string) {
    this.labels.label(name, this.nextPos);
  }

  bindSelf() {
    this.push(Op.BindSelf);
  }

  bindVirtualBlock(layout: number, block: number) {
    this.push(Op.BindVirtualBlock, layout, block);
  }

  bindVirtualNamed(layout: number, name: string) {
    this.push(Op.BindVirtualNamed, layout, this.string(name));
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

  putNull() {
    this.push(Op.Constant, this.constants.NULL_REFERENCE);
  }

  putEvalledExpr() {
    this.push(Op.PutEvalledExpr);
  }

  putEvalledArgs() {
    this.push(Op.PutEvalledArgs);
  }

  pushReifiedArgs(positional: number, _names: string[], hasDefault = false, hasInverse = false) {
    let names = this.names(_names);

    let flag = 0;
    if (hasDefault) flag |= 0b01;
    if (hasInverse) flag |= 0b10;

    this.push(Op.PushReifiedArgs, positional, names, flag);
  }

  pushImmediate(value: Opaque) {
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

  bindPositionalArgs(_names: string[], _symbols: number[]) {
    this.push(Op.BindPositionalArgs, this.names(_names), this.symbols(_symbols));
  }

  bindNamedArgs(_names: string[], _symbols: number[]) {
    this.push(Op.BindNamedArgs, this.names(_names), this.symbols(_symbols));
  }

  bindBlocks(_names: string[], _symbols: number[]) {
    this.push(Op.BindBlocks, this.names(_names), this.symbols(_symbols));
  }

  enter(enter: string, exit: string) {
    this.reserve(Op.Enter);
    this.labels.range(this.pos, Op.Enter, enter, exit);
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
    let paramSize = _block.symbolTable.getSymbolSize('local');
    let argSize = arguments.length - 1;
    let onStack = false;

    if (argSize === 1 && typeof arguments[1] === 'number') {
      // BUG: what happens if paramSize < argSize?
      // e.g. #with pushes 1 arg, #each pushes 2 - but the block might consume fewer
      argSize = arguments[1];
      onStack = true;
    } else {
      argSize = Math.min(paramSize, argSize);
    }

    if (argSize) {
      let locals = _block.symbolTable.getSymbols().locals!;
      this.pushChildScope();

      for (let i=0; i<argSize; i++) {
        if (!onStack) {
          arguments[i+1](this);
        }
        this.setVariable(locals[i]);
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
    this.push(Op.ToBoolean, func);
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

  constructor(symbolTable: SymbolTable, env: Environment, program: Program = env.program) {
    super(symbolTable, env, program);
    this.component = new ComponentBuilder(this);
  }

  compile<E>(expr: Represents<E>): E {
    if (isCompilableExpression(expr)) {
      return expr.compile(this);
    } else {
      return expr;
    }
  }

  bindPositionalArgsForLocals(locals: Dict<number>) {
    // Object.keys(locals).map(name => locals[name]);
    let names = Object.keys(locals);
    let symbols: number[] = new Array(names.length);
    for (let i = 0; i < names.length; i++) {
      symbols[i] = locals[names[i]];
    }

    this.push(Op.BindPositionalArgs, this.symbols(symbols));
  }

  preludeForLayout(layout: Layout) {
    let symbols = layout.symbolTable.getSymbols();

    if (symbols.named) {
      let named = symbols.named;
      let namedNames = Object.keys(named);
      let namedSymbols = namedNames.map(n => named[n]);
      this.push(Op.BindNamedArgs, this.names(namedNames), this.symbols(namedSymbols));
    }

    this.push(Op.BindCallerScope);

    if (symbols.yields) {
      let yields = symbols.yields;
      let yieldNames = Object.keys(yields);
      let yieldSymbols = yieldNames.map(n => yields[n]);
      this.push(Op.BindBlocks, this.names(yieldNames), this.symbols(yieldSymbols));
    }

    if (symbols.partialArgs) {
      this.push(Op.BindPartialArgs, symbols.partialArgs);
    }
  }

  yield(positional: Option<BaselineSyntax.AnyExpression[]>, to: string) {
    let table = this.symbolTable;
    let yields: Option<number>, partial: Option<number>;

    let count = compileList(positional, this);

    if (yields = table.getSymbol('yields', to)) {
      this.push(Op.GetBlock, yields);
    } else if (partial = this.symbolTable.getPartialArgs()) {
      this.push(Op.GetEvalBlock, partial, this.string(to));
    } else {
      throw new Error('[BUG] ${to} is not a valid block name.');
    }

    this.openBlock(count);
    this.closeBlock();
  }

  // TODO
  // come back to this
  labelled(callback: BlockCallback) {
    this.startLabels();
    this.enter('BEGIN', 'END');
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
