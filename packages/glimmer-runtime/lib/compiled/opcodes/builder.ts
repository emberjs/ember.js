import * as content from './content';
import * as vm from './vm';

import { Insertion } from '../../upsert';

import {
  CompiledGetBlock,
  CompiledGetBlockBySymbol,
  CompiledInPartialGetBlock
} from '../../compiled/expressions/has-block';

import { Option, Stack, Dict, Opaque, dict, expect } from 'glimmer-util';
import { expr } from '../../syntax/functions';
import { Constants, Slice } from '../../opcodes';
import { CompiledArgs } from '../expressions/args';
import { CompiledExpression } from '../expressions';
import { ComponentDefinition } from '../../component/interfaces';
import { PartialDefinition } from '../../partial';
import Environment from '../../environment';
import { SymbolTable } from 'glimmer-interfaces';
import { ComponentBuilder as IComponentBuilder } from '../../opcode-builder';
import { ComponentBuilder } from '../../compiler';
import { BaselineSyntax, InlineBlock, Template } from '../../scanner';

import {
  APPEND_OPCODES,
  OpcodeName,
  AppendOpcode,
  ConstantArray,
  ConstantOther,
  ConstantExpression,
  ConstantBlock
} from '../../opcodes';

function opcode(name: OpcodeName, op1?: number, op2?: number, op3?: number): AppendOpcode {
  return APPEND_OPCODES.construct(name, null, op1, op2, op3);
}

export interface CompilesInto<E> {
  compile(builder: OpcodeBuilder): E;
}

export type RepresentsExpression = BaselineSyntax.AnyExpression | CompiledExpression<Opaque>;

export type Represents<E> = CompilesInto<E> | E;

export type Label = string;

export interface SymbolLookup {
  symbolTable: SymbolTable;
}

type TargetOpcode = 'Jump' | 'JumpIf' | 'JumpUnless' | 'NextIter';
type RangeOpcode = 'Enter' | 'EnterList' | 'EnterWithKey' | 'NextIter';

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

  patch(constants: Constants, opcodes: Option<AppendOpcode>[]): void {
    for (let { at, target, Target } of this.jumps) {
      opcodes[at] = APPEND_OPCODES.construct(Target, null, this.labels[target]);
    }

    for (let { at, start, end, Range } of this.ranges) {
      let slice = constants.slice([this.labels[start], this.labels[end] - 1]);
      opcodes[at] = APPEND_OPCODES.construct(Range, null, slice);
    }
  }
}

export abstract class BasicOpcodeBuilder implements SymbolLookup {
  private labelsStack = new Stack<Labels>();
  public constants: Constants;
  private start: number;

  constructor(public symbolTable: SymbolTable, public env: Environment, public program: Option<AppendOpcode>[]) {
    this.constants = env.constants;
    this.start = program.length;
  }

  abstract compile<E>(expr: Represents<E>): E;
  abstract compileExpression(expr: RepresentsExpression): CompiledExpression<Opaque>;

  private get pos() {
    return this.program.length - 1;
  }

  private get nextPos() {
    return this.program.length;
  }

  push(op: Option<AppendOpcode>) {
    // console.log(`pushing ${op && op.type}`);
    this.program.push(op);
  }

  toSlice(): Slice {
    return [this.start, this.program.length - 1];
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
    label.patch(this.constants, this.program);
  }

  // partials

  putPartialDefinition(_definition: PartialDefinition<Opaque>) {
    let definition = this.constants.other(_definition);
    this.push(opcode('PutPartial', definition));
  }

  putDynamicPartialDefinition() {
    this.push(opcode('PutDynamicPartial', this.constants.other(this.symbolTable)));
  }

  evaluatePartial() {
    this.push(opcode('EvaluatePartial', this.constants.other(this.symbolTable), this.constants.other(dict())));
  }

  // components

  putComponentDefinition(definition: ComponentDefinition<Opaque>) {
    this.push(opcode('PutComponent', this.other(definition)));
  }

  putDynamicComponentDefinition() {
    this.push(opcode('PutDynamicComponent'));
  }

  openComponent(args: Represents<CompiledArgs>, shadow?: InlineBlock) {
    this.push(opcode('OpenComponent', this.args(args), shadow ? this.block(shadow) : 0));
  }

  didCreateElement() {
    this.push(opcode('DidCreateElement'));
  }

  shadowAttributes() {
    this.push(opcode('ShadowAttributes'));
    this.push(opcode('CloseBlock'));
  }

  didRenderLayout() {
    this.push(opcode('DidRenderLayout'));
  }

  closeComponent() {
    this.push(opcode('CloseComponent'));
  }

  // content

  dynamicContent(Opcode: content.AppendDynamicOpcode<Insertion>) {
    this.push(opcode('DynamicContent', this.other(Opcode)));
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
    this.push(opcode('Text', this.constants.string(text)));
  }

  openPrimitiveElement(tag: string) {
    this.push(opcode('OpenElement', this.constants.string(tag)));
  }

  openComponentElement(tag: string) {
    this.push(opcode('OpenComponentElement', this.constants.string(tag)));
  }

  openDynamicPrimitiveElement() {
    this.push(opcode('OpenDynamicElement'));
  }

  flushElement() {
    this.push(opcode('FlushElement'));
  }

  closeElement() {
    this.push(opcode('CloseElement'));
  }

  staticAttr(_name: string, _namespace: Option<string>, _value: string) {
    let name = this.constants.string(_name);
    let namespace = _namespace ? this.constants.string(_namespace) : 0;
    let value = this.constants.string(_value);

    this.push(opcode('StaticAttr', name, value, namespace));
  }

  dynamicAttrNS(_name: string, _namespace: string, trusting: boolean) {
    let name = this.constants.string(_name);
    let namespace = this.constants.string(_namespace);

    this.push(opcode('DynamicAttrNS', name, namespace, (trusting as any)|0));
  }

  dynamicAttr(_name: string, trusting: boolean) {
    let name = this.constants.string(_name);
    this.push(opcode('DynamicAttr', name, (trusting as any)|0));
  }

  comment(_comment: string) {
    let comment = this.constants.string(_comment);
    this.push(opcode('Comment', comment));
  }

  modifier(_name: string, _args: Represents<CompiledArgs>) {
    let args = this.constants.expression(this.compile(_args));
    let _modifierManager = this.env.lookupModifier([_name], this.symbolTable);
    let modifierManager = this.constants.other(_modifierManager);
    let name = this.constants.string(_name);
    this.push(opcode('Modifier', name, modifierManager, args));
  }

  // lists

  putIterator() {
    this.push(opcode('PutIterator'));
  }

  enterList(start: string, end: string) {
    this.push(null);
    this.labels.range(this.pos, 'EnterList', start, end);
  }

  exitList() {
    this.push(opcode('ExitList'));
  }

  enterWithKey(start: string, end: string) {
    this.push(null);
    this.labels.range(this.pos, 'EnterWithKey', start, end);
  }

  nextIter(end: string) {
    this.push(null);
    this.labels.jump(this.pos, 'NextIter', end);
  }

  // vm

  openBlock(_args: Represents<CompiledArgs>, _inner: CompiledGetBlock) {
    let args = this.constants.expression(this.compile(_args));
    let inner = this.constants.other(_inner);
    this.push(opcode('OpenBlock', inner, args));
  }

  closeBlock() {
    this.push(opcode('CloseBlock'));
  }

  pushRemoteElement() {
    this.push(opcode('PushRemoteElement'));
  }

  popRemoteElement() {
    this.push(opcode('PopRemoteElement'));
  }

  popElement() {
    this.push(opcode('PopElement'));
  }

  label(name: string) {
    this.labels.label(name, this.nextPos);
  }

  pushChildScope() {
    this.push(opcode('PushChildScope'));
  }

  popScope() {
    this.push(opcode('PopScope'));
  }

  pushDynamicScope() {
    this.push(opcode('PushDynamicScope'));
  }

  popDynamicScope() {
    this.push(opcode('PopDynamicScope'));
  }

  putNull() {
    this.push(opcode('Put', this.constants.NULL_REFERENCE));
  }

  putValue(_expression: RepresentsExpression) {
    let expr = this.constants.expression(this.compileExpression(_expression));
    this.push(opcode('EvaluatePut', expr));
  }

  putArgs(_args: Represents<CompiledArgs>) {
    let args = this.constants.expression(this.compile(_args));
    this.push(opcode('PutArgs', args));
  }

  bindDynamicScope(_names: string[]) {
    this.push(opcode('BindDynamicScope', this.names(_names)));
  }

  bindPositionalArgs(_names: string[], _symbols: number[]) {
    this.push(opcode('BindPositionalArgs', this.names(_names), this.symbols(_symbols)));
  }

  bindNamedArgs(_names: string[], _symbols: number[]) {
    this.push(opcode('BindNamedArgs', this.names(_names), this.symbols(_symbols)));
  }

  bindBlocks(_names: string[], _symbols: number[]) {
    this.push(opcode('BindBlocks', this.names(_names), this.symbols(_symbols)));
  }

  enter(enter: string, exit: string) {
    this.push(null);
    this.labels.range(this.pos, 'Enter', enter, exit);
  }

  exit() {
    this.push(opcode('Exit'));
  }

  evaluate(_block: InlineBlock) {
    let block = this.constants.block(_block);
    this.push(opcode('Evaluate', block));
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
    this.push(opcode('Test', func));
  }

  jump(target: string) {
    this.push(null);
    this.labels.jump(this.pos, 'Jump', target);
  }

  jumpIf(target: string) {
    this.push(null);
    this.labels.jump(this.pos, 'JumpIf', target);
  }

  jumpUnless(target: string) {
    this.push(null);
    this.labels.jump(this.pos, 'JumpUnless', target);
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

  constructor(symbolTable: SymbolTable, env: Environment, program: AppendOpcode[] = env.program) {
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
    let symbols = Object.keys(locals).map(name => locals[name]);
    this.push(opcode('BindPositionalArgs', this.symbols(symbols)));
  }

  preludeForLayout(layout: Template) {
    let symbols = layout.symbolTable.getSymbols();

    if (symbols.named) {
      let named = symbols.named;
      let namedNames = Object.keys(named);
      let namedSymbols = namedNames.map(n => named[n]);
      this.push(opcode('BindNamedArgs', this.names(namedNames), this.symbols(namedSymbols)));
    }

    this.push(opcode('BindCallerScope'));

    if (symbols.yields) {
      let yields = symbols.yields;
      let yieldNames = Object.keys(yields);
      let yieldSymbols = yieldNames.map(n => yields[n]);
      this.push(opcode('BindBlocks', this.names(yieldNames), this.symbols(yieldSymbols)));
    }

    if (symbols.partialArgs) {
      this.push(opcode('BindPartialArgs', symbols.partialArgs));
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
