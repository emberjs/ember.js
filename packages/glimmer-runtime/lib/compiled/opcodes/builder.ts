import * as component from './component';
import * as partial from '../../compiled/opcodes/partial';
import * as content from './content';
import * as dom from './dom';
import * as lists from './lists';
import * as vm from './vm';
import * as blocks from './blocks';

import {
  CompiledGetBlock,
  CompiledGetBlockBySymbol,
  CompiledInPartialGetBlock
} from '../../compiled/expressions/has-block';

import {
  OpenBlockOpcode,
  CloseBlockOpcode
} from '../../compiled/opcodes/blocks';

import { Option, Stack, Dict, Opaque, dict, assert, expect } from 'glimmer-util';
import { expr } from '../../syntax/functions';
import { Opcode, OpSeq, inspect } from '../../opcodes';
import { CompiledArgs } from '../expressions/args';
import { CompiledExpression } from '../expressions';
import { ComponentDefinition } from '../../component/interfaces';
import { PartialDefinition } from '../../partial';
import Environment from '../../environment';
import { SymbolTable } from 'glimmer-interfaces';
import { ComponentBuilder as IComponentBuilder } from '../../opcode-builder';
import { ComponentBuilder } from '../../compiler';
import { BaselineSyntax, InlineBlock, Layout } from '../../scanner';

export interface CompilesInto<E> {
  compile(builder: OpcodeBuilder): E;
}

export type RepresentsExpression = BaselineSyntax.AnyExpression | CompiledExpression<Opaque>;

export type Represents<E> = CompilesInto<E> | E;

export type Label = string;

// export class StatementCompilationBufferProxy implements StatementCompilationBuffer {

//   constructor(protected inner: StatementCompilationBuffer, public symbolTable: SymbolTable = inner.symbolTable) {}

//   get component(): ComponentBuilder {
//     return this.inner.component;
//   }

//   toOpSeq(): OpSeq {
//     return this.inner.toOpSeq();
//   }

//   append<T extends Opcode>(opcode: T) {
//     this.inner.append(opcode);
//   }
// }

export interface SymbolLookup {
  symbolTable: SymbolTable;
}

export interface CompileInto {
  append(op: Opcode): void;
}

interface RangeOpcodeConstructor {
  new(slice: Slice): Opcode;
}

interface TargetOpcodeConstructor {
  new(target: number): Opcode;
}

export class Slice {
  constructor(
    public ops: OpSeq,
    public start: number,
    public end: number
  ) {}
}

class Labels {
  labels = dict<number>();
  jumps: { at: number, target: string, TargetConstructor: TargetOpcodeConstructor }[] = [];
  ranges: { at: number, start: string, end: string, RangeConstructor: RangeOpcodeConstructor }[] = [];

  label(name: string, index: number) {
    this.labels[name] = index;
  }

  jump(at: number, TargetConstructor: TargetOpcodeConstructor, target: string) {
    this.jumps.push({ at, target, TargetConstructor });
  }

  range(at: number, RangeConstructor: RangeOpcodeConstructor, start: string, end: string) {
    this.ranges.push({ at, start, end, RangeConstructor });
  }

  patch(opcodes: Option<Opcode>[]): void {
    for (let { at, target, TargetConstructor } of this.jumps) {
      opcodes[at] = new TargetConstructor(this.labels[target]);
    }

    for (let { at, start, end, RangeConstructor } of this.ranges) {
      let slice = new Slice(opcodes as OpSeq, this.labels[start], this.labels[end] - 1);
      opcodes[at] = new RangeConstructor(slice);
    }
  }
}

export abstract class BasicOpcodeBuilder implements SymbolLookup {
  private labelsStack = new Stack<Labels>();

  constructor(public symbolTable: SymbolTable, public env: Environment) {
  }

  abstract compile<E>(expr: Represents<E>): E;
  abstract compileExpression(expr: RepresentsExpression): CompiledExpression<Opaque>;

  private ops: Option<Opcode>[] = [];

  private get pos() {
    return this.ops.length - 1;
  }

  private get nextPos() {
    return this.ops.length;
  }

  push(op: Option<Opcode>) {
    console.log(`pushing ${op && op.type}`);
    this.ops.push(op);
  }

  toOpSeq(): OpSeq {
    console.log(inspect(this.ops as OpSeq));
    assert(this.ops.every(op => op !== null), 'bug: holes left in the opseq');
    return this.ops as OpSeq;
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
    label.patch(this.ops);
  }

  // partials

  putPartialDefinition(definition: PartialDefinition<Opaque>) {
    this.push(new partial.PutPartialDefinitionOpcode(definition));
  }

  putDynamicPartialDefinition() {
    this.push(new partial.PutDynamicPartialDefinitionOpcode(this.symbolTable));
  }

  evaluatePartial() {
    this.push(new partial.EvaluatePartialOpcode(this.symbolTable));
  }

  // components

  putComponentDefinition(definition: ComponentDefinition<Opaque>) {
    this.push(new component.PutComponentDefinitionOpcode(definition));
  }

  putDynamicComponentDefinition() {
    this.push(new component.PutDynamicComponentDefinitionOpcode());
  }

  openComponent(args: Represents<CompiledArgs>, shadow?: InlineBlock) {
    this.push(new component.OpenComponentOpcode(this.compile(args), shadow || null));
  }

  didCreateElement() {
    this.push(new component.DidCreateElementOpcode());
  }

  shadowAttributes() {
    this.push(new component.ShadowAttributesOpcode());
    this.push(new blocks.CloseBlockOpcode());
  }

  didRenderLayout() {
    this.push(new component.DidRenderLayoutOpcode());
  }

  closeComponent() {
    this.push(new component.CloseComponentOpcode());
  }

  // content

  cautiousAppend() {
    this.push(new content.OptimizedCautiousAppendOpcode());
  }

  trustingAppend() {
    this.push(new content.OptimizedTrustingAppendOpcode());
  }

  guardedCautiousAppend(expression: RepresentsExpression) {
    this.push(new content.GuardedCautiousAppendOpcode(this.compileExpression(expression), this.symbolTable));
  }

  guardedTrustingAppend(expression: RepresentsExpression) {
    this.push(new content.GuardedTrustingAppendOpcode(this.compileExpression(expression), this.symbolTable));
  }

  // dom

  text(text: string) {
    this.push(new dom.TextOpcode(text));
  }

  openPrimitiveElement(tag: string) {
    this.push(new dom.OpenPrimitiveElementOpcode(tag));
  }

  openComponentElement(tag: string) {
    this.push(new dom.OpenComponentElementOpcode(tag));
  }

  openDynamicPrimitiveElement() {
    this.push(new dom.OpenDynamicPrimitiveElementOpcode());
  }

  flushElement() {
    this.push(new dom.FlushElementOpcode());
  }

  closeElement() {
    this.push(new dom.CloseElementOpcode());
  }

  staticAttr(name: string, namespace: Option<string>, value: any) {
    this.push(new dom.StaticAttrOpcode(namespace, name, value));
  }

  dynamicAttrNS(name: string, namespace: string, isTrusting: boolean) {
    this.push(new dom.DynamicAttrNSOpcode(name, namespace, isTrusting));
  }

  dynamicAttr(name: string, isTrusting: boolean) {
    this.push(new dom.DynamicAttrOpcode(name, isTrusting));
  }

  comment(comment: string) {
    this.push(new dom.CommentOpcode(comment));
  }

  modifier(name: string, args: Represents<CompiledArgs>) {
    let modifierManager = this.env.lookupModifier([name], this.symbolTable);
    this.push(new dom.ModifierOpcode(name, modifierManager, this.compile(args)));
  }

  // lists

  putIterator() {
    this.push(new lists.PutIteratorOpcode());
  }

  enterList(start: string, end: string) {
    this.push(null);
    this.labels.range(this.pos, lists.EnterListOpcode, start, end);
  }

  exitList() {
    this.push(new lists.ExitListOpcode());
  }

  enterWithKey(start: string, end: string) {
    this.push(null);
    this.labels.range(this.pos, lists.EnterWithKeyOpcode, start, end);
  }

  nextIter(end: string) {
    this.push(null);
    this.labels.jump(this.pos, lists.NextIterOpcode, end);
  }

  // vm

  openBlock(args: Represents<CompiledArgs>, inner: CompiledGetBlock) {
    this.push(new OpenBlockOpcode(inner, this.compile(args)));
  }

  closeBlock() {
    this.push(new CloseBlockOpcode());
  }

  pushRemoteElement() {
    this.push(new dom.PushRemoteElementOpcode());
  }

  popRemoteElement() {
    this.push(new dom.PopRemoteElementOpcode());
  }

  popElement() {
    this.push(new dom.PopElementOpcode());
  }

  label(name: string) {
    this.labels.label(name, this.nextPos);
  }

  pushChildScope() {
    this.push(new vm.PushChildScopeOpcode());
  }

  popScope() {
    this.push(new vm.PopScopeOpcode());
  }

  pushDynamicScope() {
    this.push(new vm.PushDynamicScopeOpcode());
  }

  popDynamicScope() {
    this.push(new vm.PopDynamicScopeOpcode());
  }

  putNull() {
    this.push(new vm.PutNullOpcode());
  }

  putValue(expression: RepresentsExpression) {
    this.push(new vm.PutValueOpcode(this.compileExpression(expression)));
  }

  putArgs(args: Represents<CompiledArgs>) {
    this.push(new vm.PutArgsOpcode(this.compile(args)));
  }

  bindDynamicScope(names: ReadonlyArray<string>) {
    this.push(new vm.BindDynamicScopeOpcode(names));
  }

  bindPositionalArgs(names: string[], symbols: number[]) {
    this.push(new vm.BindPositionalArgsOpcode(names, symbols));
  }

  bindNamedArgs(names: string[], symbols: number[]) {
    this.push(new vm.BindNamedArgsOpcode(names, symbols));
  }

  bindBlocks(names: string[], symbols: number[]) {
    this.push(new vm.BindBlocksOpcode(names, symbols));
  }

  enter(enter: string, exit: string) {
    this.push(null);
    this.labels.range(this.pos, vm.EnterOpcode, enter, exit);
  }

  exit() {
    this.push(new vm.ExitOpcode());
  }

  evaluate(name: string, block: InlineBlock) {
    this.push(new vm.EvaluateOpcode(name, block));
  }

  test(testFunc: 'const' | 'simple' | 'environment' | vm.TestFunction) {
    if (testFunc === 'const') {
      this.push(new vm.TestOpcode(vm.ConstTest));
    } else if (testFunc === 'simple') {
      this.push(new vm.TestOpcode(vm.SimpleTest));
    } else if (testFunc === 'environment') {
      this.push(new vm.TestOpcode(vm.EnvironmentTest));
    } else if (typeof testFunc === 'function') {
      this.push(new vm.TestOpcode(testFunc));
    } else {
      throw new Error('unreachable');
    }
  }

  jump(target: string) {
    this.push(null);
    this.labels.jump(this.pos, vm.JumpOpcode, target);
  }

  jumpIf(target: string) {
    this.push(null);
    this.labels.jump(this.pos, vm.JumpIfOpcode, target);
  }

  jumpUnless(target: string) {
    this.push(null);
    this.labels.jump(this.pos, vm.JumpUnlessOpcode, target);
  }
}

function isCompilableExpression<E>(expr: Represents<E>): expr is CompilesInto<E> {
  return expr && typeof expr['compile'] === 'function';
}

export default class OpcodeBuilder extends BasicOpcodeBuilder {
  public component: IComponentBuilder;

  constructor(symbolTable: SymbolTable, env: Environment) {
    super(symbolTable, env);
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
    this.push(vm.BindPositionalArgsOpcode.create(locals));
  }

  preludeForLayout(layout: Layout) {
    let symbols = layout.symbolTable.getSymbols();

    if (symbols.named) {
      this.push(vm.BindNamedArgsOpcode.create(layout));
    }

    this.push(new vm.BindCallerScopeOpcode());

    if (symbols.yields) {
      this.push(vm.BindBlocksOpcode.create(layout));
    }

    if (symbols.partialArgs) {
      this.push(vm.BindPartialArgsOpcode.create(layout));
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
  block(args: Option<Represents<CompiledArgs>>, callback: BlockCallback) {
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
