import * as content from './content';
import * as vm from './vm';

import { Insertion } from '../../upsert';

import {
  CompiledGetBlock,
  CompiledGetBlockBySymbol,
  CompiledInPartialGetBlock
} from '../../compiled/expressions/has-block';

import { Option, Stack, Dict, Opaque, dict, expect } from '@glimmer/util';
import { expr } from '../../syntax/functions';
import { Constants } from '../../opcodes';
import { CompiledArgs } from '../expressions/args';
import { CompiledExpression } from '../expressions';
import { ComponentDefinition } from '../../component/interfaces';
import { PartialDefinition } from '../../partial';
import Environment, { Program } from '../../environment';
import { SymbolTable } from '@glimmer/interfaces';
import { ComponentBuilder as IComponentBuilder } from '../../opcode-builder';
import { ComponentBuilder } from '../../compiler';
import { BaselineSyntax, InlineBlock, Template } from '../../scanner';

import {
  OpcodeName as Op,
  ConstantArray,
  ConstantOther,
  ConstantExpression,
  ConstantBlock
} from '../../opcodes';

export interface CompilesInto<E> {
  compile(builder: OpcodeBuilder): E;
}

export type RepresentsExpression = BaselineSyntax.AnyExpression | CompiledExpression<Opaque>;

export type Represents<E> = CompilesInto<E> | E;

export type Label = string;

export interface SymbolLookup {
  symbolTable: SymbolTable;
}

type TargetOpcode = Op.Jump | Op.JumpIf | Op.JumpUnless | Op.NextIter;
type RangeOpcode = Op.Enter | Op.EnterList | Op.EnterWithKey;

class Labels {
  labels = dict<number>();
  jumps: { at: number, target: string, Target: TargetOpcode }[] = [];
  ranges: { at: number, start: string, end: string, Range: RangeOpcode }[] = [];

  label(name: string, index: number) {
    this.labels[name] = index;
  }

  jump(at: number, Target: TargetOpcode, target: string) {
    this.jumps.push({ at, target, Target });
  }

  range(at: number, Range: RangeOpcode, start: string, end: string) {
    this.ranges.push({ at, start, end, Range });
  }

  patch(opcodes: Program): void {
    for (let i = 0; i < this.jumps.length; i++) {
      let { at, target, Target } = this.jumps[i];
      opcodes.set(at, Target, this.labels[target]);
    }

    for (let i = 0; i < this.ranges.length; i++) {
      let { at, start, end, Range } = this.ranges[i];
      opcodes.set(at, Range, this.labels[start], this.labels[end] - 1);
    }
  }
}

export abstract class BasicOpcodeBuilder implements SymbolLookup {
  private labelsStack = new Stack<Labels>();
  public constants: Constants;
  public start: number;

  constructor(public symbolTable: SymbolTable, public env: Environment, public program: Program) {
    this.constants = env.constants;
    this.start = program.next;
  }

  abstract compile<E>(expr: Represents<E>): E;
  abstract compileExpression(expr: RepresentsExpression): CompiledExpression<Opaque>;

  public get end(): number {
    return this.program.next;
  }

  private get pos() {
    return this.program.current;
  }

  private get nextPos() {
    return this.program.next;
  }

  protected opcode(name: Op, op1?: number, op2?: number, op3?: number) {
    this.push(name, op1, op2, op3);
  }

  push(type: number, op1 = 0, op2 = 0, op3 = 0) {
    this.program.push(type, op1, op2, op3);
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
    this.opcode(Op.PutPartial, definition);
  }

  putDynamicPartialDefinition() {
    this.opcode(Op.PutDynamicPartial, this.constants.other(this.symbolTable));
  }

  evaluatePartial() {
    this.opcode(Op.EvaluatePartial, this.constants.other(this.symbolTable), this.constants.other(dict()));
  }

  // components

  putComponentDefinition(definition: ComponentDefinition<Opaque>) {
    this.opcode(Op.PutComponent, this.other(definition));
  }

  putDynamicComponentDefinition() {
    this.opcode(Op.PutDynamicComponent);
  }

  openComponent(args: Represents<CompiledArgs>, shadow?: InlineBlock) {
    this.opcode(Op.OpenComponent, this.args(args), shadow ? this.block(shadow) : 0);
  }

  didCreateElement() {
    this.opcode(Op.DidCreateElement);
  }

  shadowAttributes() {
    this.opcode(Op.ShadowAttributes);
    this.opcode(Op.CloseBlock);
  }

  didRenderLayout() {
    this.opcode(Op.DidRenderLayout);
  }

  closeComponent() {
    this.opcode(Op.CloseComponent);
  }

  // content

  dynamicContent(Opcode: content.AppendDynamicOpcode<Insertion>) {
    this.opcode(Op.DynamicContent, this.other(Opcode));
  }

  cautiousAppend() {
    this.dynamicContent(new content.OptimizedCautiousAppendOpcode());
  }

  trustingAppend() {
    this.dynamicContent(new content.OptimizedTrustingAppendOpcode());
  }

  guardedCautiousAppend(expression: RepresentsExpression) {
    this.dynamicContent(new content.GuardedCautiousAppendOpcode(this.compileExpression(expression), this.symbolTable));
  }

  guardedTrustingAppend(expression: RepresentsExpression) {
    this.dynamicContent(new content.GuardedTrustingAppendOpcode(this.compileExpression(expression), this.symbolTable));
  }

  // dom

  text(text: string) {
    this.opcode(Op.Text, this.constants.string(text));
  }

  openPrimitiveElement(tag: string) {
    this.opcode(Op.OpenElement, this.constants.string(tag));
  }

  openComponentElement(tag: string) {
    this.opcode(Op.OpenComponentElement, this.constants.string(tag));
  }

  openDynamicPrimitiveElement() {
    this.opcode(Op.OpenDynamicElement);
  }

  flushElement() {
    this.opcode(Op.FlushElement);
  }

  closeElement() {
    this.opcode(Op.CloseElement);
  }

  staticAttr(_name: string, _namespace: Option<string>, _value: string) {
    let name = this.constants.string(_name);
    let namespace = _namespace ? this.constants.string(_namespace) : 0;
    let value = this.constants.string(_value);

    this.opcode(Op.StaticAttr, name, value, namespace);
  }

  dynamicAttrNS(_name: string, _namespace: string, trusting: boolean) {
    let name = this.constants.string(_name);
    let namespace = this.constants.string(_namespace);

    this.opcode(Op.DynamicAttrNS, name, namespace, (trusting as any)|0);
  }

  dynamicAttr(_name: string, trusting: boolean) {
    let name = this.constants.string(_name);
    this.opcode(Op.DynamicAttr, name, (trusting as any)|0);
  }

  comment(_comment: string) {
    let comment = this.constants.string(_comment);
    this.opcode(Op.Comment, comment);
  }

  modifier(_name: string, _args: Represents<CompiledArgs>) {
    let args = this.constants.expression(this.compile(_args));
    let _modifierManager = this.env.lookupModifier(_name, this.symbolTable);
    let modifierManager = this.constants.other(_modifierManager);
    let name = this.constants.string(_name);
    this.opcode(Op.Modifier, name, modifierManager, args);
  }

  // lists

  putIterator() {
    this.opcode(Op.PutIterator);
  }

  enterList(start: string, end: string) {
    this.push(Op.EnterList);
    this.labels.range(this.pos, Op.EnterList, start, end);
  }

  exitList() {
    this.opcode(Op.ExitList);
  }

  enterWithKey(start: string, end: string) {
    this.push(Op.EnterWithKey);
    this.labels.range(this.pos, Op.EnterWithKey, start, end);
  }

  nextIter(end: string) {
    this.push(Op.NextIter);
    this.labels.jump(this.pos, Op.NextIter, end);
  }

  // vm

  openBlock(_args: Represents<CompiledArgs>, _inner: CompiledGetBlock) {
    let args = this.constants.expression(this.compile(_args));
    let inner = this.constants.other(_inner);
    this.opcode(Op.OpenBlock, inner, args);
  }

  closeBlock() {
    this.opcode(Op.CloseBlock);
  }

  pushRemoteElement() {
    this.opcode(Op.PushRemoteElement);
  }

  popRemoteElement() {
    this.opcode(Op.PopRemoteElement);
  }

  popElement() {
    this.opcode(Op.PopElement);
  }

  label(name: string) {
    this.labels.label(name, this.nextPos);
  }

  pushChildScope() {
    this.opcode(Op.PushChildScope);
  }

  popScope() {
    this.opcode(Op.PopScope);
  }

  pushDynamicScope() {
    this.opcode(Op.PushDynamicScope);
  }

  popDynamicScope() {
    this.opcode(Op.PopDynamicScope);
  }

  putNull() {
    this.opcode(Op.Put, this.constants.NULL_REFERENCE);
  }

  putValue(_expression: RepresentsExpression) {
    let expr = this.constants.expression(this.compileExpression(_expression));
    this.opcode(Op.EvaluatePut, expr);
  }

  putArgs(_args: Represents<CompiledArgs>) {
    let args = this.constants.expression(this.compile(_args));
    this.opcode(Op.PutArgs, args);
  }

  bindDynamicScope(_names: string[]) {
    this.opcode(Op.BindDynamicScope, this.names(_names));
  }

  bindPositionalArgs(_names: string[], _symbols: number[]) {
    this.opcode(Op.BindPositionalArgs, this.names(_names), this.symbols(_symbols));
  }

  bindNamedArgs(_names: string[], _symbols: number[]) {
    this.opcode(Op.BindNamedArgs, this.names(_names), this.symbols(_symbols));
  }

  bindBlocks(_names: string[], _symbols: number[]) {
    this.opcode(Op.BindBlocks, this.names(_names), this.symbols(_symbols));
  }

  enter(enter: string, exit: string) {
    this.push(Op.Enter);
    this.labels.range(this.pos, Op.Enter, enter, exit);
  }

  exit() {
    this.opcode(Op.Exit);
  }

  evaluate(_block: InlineBlock) {
    let block = this.constants.block(_block);
    this.opcode(Op.Evaluate, block);
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
    this.opcode(Op.Test, func);
  }

  jump(target: string) {
    this.push(Op.Jump);
    this.labels.jump(this.pos, Op.Jump, target);
  }

  jumpIf(target: string) {
    this.push(Op.JumpIf);
    this.labels.jump(this.pos, Op.JumpIf, target);
  }

  jumpUnless(target: string) {
    this.push(Op.JumpUnless);
    this.labels.jump(this.pos, Op.JumpUnless, target);
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

  protected args(args: Represents<CompiledArgs>): ConstantExpression {
    return this.constants.expression(this.compile(args));
  }

  protected block(block: InlineBlock): ConstantBlock {
    return this.constants.block(block);
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

  compileExpression(expression: RepresentsExpression): CompiledExpression<Opaque> {
    if (expression instanceof CompiledExpression) {
      return expression;
    } else {
      return expr(expression, this);
    }
  }

  bindPositionalArgsForLocals(locals: Dict<number>) {
    let names = Object.keys(locals);
    let symbols: number[] = new Array(names.length); //Object.keys(locals).map(name => locals[name]);
    for (let i = 0; i < names.length; i++) {
      symbols[i] = locals[names[i]];
    }
    this.opcode(Op.BindPositionalArgs, this.symbols(symbols));
  }

  preludeForLayout(layout: Template) {
    let symbols = layout.symbolTable.getSymbols();

    if (symbols.named) {
      let named = symbols.named;
      let namedNames = Object.keys(named);
      let namedSymbols = namedNames.map(n => named[n]);
      this.opcode(Op.BindNamedArgs, this.names(namedNames), this.symbols(namedSymbols));
    }

    this.opcode(Op.BindCallerScope);

    if (symbols.yields) {
      let yields = symbols.yields;
      let yieldNames = Object.keys(yields);
      let yieldSymbols = yieldNames.map(n => yields[n]);
      this.opcode(Op.BindBlocks, this.names(yieldNames), this.symbols(yieldSymbols));
    }

    if (symbols.partialArgs) {
      this.opcode(Op.BindPartialArgs, symbols.partialArgs);
    }
  }

  yield(args: Represents<CompiledArgs>, to: string) {
    let yields: Option<number>, partial: Option<number>;
    let inner: CompiledGetBlock;

    if (yields = this.symbolTable.getSymbol('yields', to)) {
      inner = new CompiledGetBlockBySymbol(yields, to);
    } else if (partial = this.symbolTable.getPartialArgs()) {
      inner = new CompiledInPartialGetBlock(partial, to);
    } else {
      throw new Error('[BUG] ${to} is not a valid block name.');
    }

    this.openBlock(args, inner);
    this.closeBlock();
  }

  // TODO
  // come back to this
  labelled(args: Option<Represents<CompiledArgs>>, callback: BlockCallback) {
    if (args) this.putArgs(args);

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
    this.nextIter('BREAK');
    this.enterWithKey('BEGIN', 'END');
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
