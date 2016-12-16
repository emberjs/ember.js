import * as component from './component';
import * as partial from '../../compiled/opcodes/partial';
import * as content from './content';
import * as dom from './dom';
import * as lists from './lists';
import * as vm from './vm';
import * as Syntax from '../../syntax/core';

import { Option, Stack, Dict, Opaque, dict } from 'glimmer-util';
import { Opcode, OpSeq } from '../../opcodes';
import { CompiledArgs } from '../expressions/args';
import { CompiledExpression } from '../expressions';
import { ComponentDefinition } from '../../component/interfaces';
import { PartialDefinition } from '../../partial';
import Environment from '../../environment';
import { InlineBlock, Layout } from '../blocks';
import { EMPTY_ARRAY } from '../../utils';
import { SymbolTable } from 'glimmer-interfaces';
import { ComponentBuilder } from '../../opcode-builder';
import { ProgramBuffer } from '../../compiler';

export interface CompilesInto<E> {
  compile(builder: OpcodeBuilder): E;
}

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
  append(op: Opcode);
}

export abstract class BasicOpcodeBuilder implements SymbolLookup, CompileInto {
  private labelsStack = new Stack<Dict<vm.LabelOpcode>>();
  public component: ComponentBuilder;

  constructor(private inner: ProgramBuffer, public symbolTable: SymbolTable, public env: Environment) {
    this.component = inner.component;
  }

  abstract compile<E>(expr: Represents<E>): E;

  append(op: Opcode) {
    this.inner.append(op);
  }

  toOpSeq(): OpSeq {
    return this.inner;
  }

  // helpers

  get labels() {
    return this.labelsStack.current;
  }

  startLabels() {
    this.labelsStack.push(dict<vm.LabelOpcode>());
  }

  stopLabels() {
    this.labelsStack.pop();
  }

  labelFor(name: string): vm.LabelOpcode {
    let labels = this.labels;
    let label = labels[name];

    if (!label) {
      label = labels[name] = new vm.LabelOpcode(name);
    }

    return label;
  }

  // partials

  putPartialDefinition(definition: PartialDefinition<Opaque>) {
    this.append(new partial.PutPartialDefinitionOpcode(definition));
  }

  putDynamicPartialDefinition() {
    this.append(new partial.PutDynamicPartialDefinitionOpcode(this.symbolTable));
  }

  evaluatePartial() {
    this.append(new partial.EvaluatePartialOpcode(this.symbolTable));
  }

  // components

  putComponentDefinition(definition: ComponentDefinition<Opaque>) {
    this.append(new component.PutComponentDefinitionOpcode(definition));
  }

  putDynamicComponentDefinition() {
    this.append(new component.PutDynamicComponentDefinitionOpcode());
  }

  openComponent(args: Represents<CompiledArgs>, shadow: ReadonlyArray<string> = EMPTY_ARRAY) {
    this.append(new component.OpenComponentOpcode(this.compile(args), shadow));
  }

  didCreateElement() {
    this.append(new component.DidCreateElementOpcode());
  }

  shadowAttributes() {
    this.append(new component.ShadowAttributesOpcode());
  }

  didRenderLayout() {
    this.append(new component.DidRenderLayoutOpcode());
  }

  closeComponent() {
    this.append(new component.CloseComponentOpcode());
  }

  // content

  cautiousAppend() {
    this.append(new content.OptimizedCautiousAppendOpcode());
  }

  trustingAppend() {
    this.append(new content.OptimizedTrustingAppendOpcode());
  }

  // dom

  text(text: string) {
    this.append(new dom.TextOpcode(text));
  }

  openPrimitiveElement(tag: string) {
    this.append(new dom.OpenPrimitiveElementOpcode(tag));
  }

  openComponentElement(tag: string) {
    this.append(new dom.OpenComponentElementOpcode(tag));
  }

  openDynamicPrimitiveElement() {
    this.append(new dom.OpenDynamicPrimitiveElementOpcode());
  }

  flushElement() {
    this.append(new dom.FlushElementOpcode());
  }

  closeElement() {
    this.append(new dom.CloseElementOpcode());
  }

  staticAttr(name: string, namespace: string, value: any) {
    this.append(new dom.StaticAttrOpcode(namespace, name, value));
  }

  dynamicAttrNS(name: string, namespace: string, isTrusting: boolean) {
    this.append(new dom.DynamicAttrNSOpcode(name, namespace, isTrusting));
  }

  dynamicAttr(name: string, isTrusting: boolean) {
    this.append(new dom.DynamicAttrOpcode(name, isTrusting));
  }

  comment(comment: string) {
    this.append(new dom.CommentOpcode(comment));
  }

  // lists

  putIterator() {
    this.append(new lists.PutIteratorOpcode());
  }

  enterList(start: string, end: string) {
    this.append(new lists.EnterListOpcode(this.labelFor(start), this.labelFor(end)));
  }

  exitList() {
    this.append(new lists.ExitListOpcode());
  }

  enterWithKey(start: string, end: string) {
    this.append(new lists.EnterWithKeyOpcode(this.labelFor(start), this.labelFor(end)));
  }

  nextIter(end: string) {
    this.append(new lists.NextIterOpcode(this.labelFor(end)));
  }

  // vm

  pushRemoteElement() {
    this.append(new dom.PushRemoteElementOpcode());
  }

  popRemoteElement() {
    this.append(new dom.PopRemoteElementOpcode());
  }

  popElement() {
    this.append(new dom.PopElementOpcode());
  }

  label(name: string) {
    this.append(this.labelFor(name));
  }

  pushChildScope() {
    this.append(new vm.PushChildScopeOpcode());
  }

  popScope() {
    this.append(new vm.PopScopeOpcode());
  }

  pushDynamicScope() {
    this.append(new vm.PushDynamicScopeOpcode());
  }

  popDynamicScope() {
    this.append(new vm.PopDynamicScopeOpcode());
  }

  putNull() {
    this.append(new vm.PutNullOpcode());
  }

  putValue(expression: Represents<CompiledExpression<Opaque>>) {
    this.append(new vm.PutValueOpcode(this.compile(expression)));
  }

  putArgs(args: Represents<CompiledArgs>) {
    this.append(new vm.PutArgsOpcode(this.compile(args)));
  }

  bindDynamicScope(names: ReadonlyArray<string>) {
    this.append(new vm.BindDynamicScopeOpcode(names));
  }

  bindPositionalArgs(names: string[], symbols: number[]) {
    this.append(new vm.BindPositionalArgsOpcode(names, symbols));
  }

  bindNamedArgs(names: string[], symbols: number[]) {
    this.append(new vm.BindNamedArgsOpcode(names, symbols));
  }

  bindBlocks(names: string[], symbols: number[]) {
    this.append(new vm.BindBlocksOpcode(names, symbols));
  }

  enter(enter: Label, exit: Label) {
    this.append(new vm.EnterOpcode(this.labelFor(enter), this.labelFor(exit)));
  }

  exit() {
    this.append(new vm.ExitOpcode());
  }

  evaluate(name: string, block: InlineBlock) {
    this.append(new vm.EvaluateOpcode(name, block));
  }

  test(testFunc: 'const' | 'simple' | 'environment' | vm.TestFunction) {
    if (testFunc === 'const') {
      this.append(new vm.TestOpcode(vm.ConstTest));
    } else if (testFunc === 'simple') {
      this.append(new vm.TestOpcode(vm.SimpleTest));
    } else if (testFunc === 'environment') {
      this.append(new vm.TestOpcode(vm.EnvironmentTest));
    } else if (typeof testFunc === 'function') {
      this.append(new vm.TestOpcode(testFunc));
    } else {
      throw new Error('unreachable');
    }
  }

  jump(target: string) {
    this.append(new vm.JumpOpcode(this.labelFor(target)));
  }

  jumpIf(target: string) {
    this.append(new vm.JumpIfOpcode(this.labelFor(target)));
  }

  jumpUnless(target: string) {
    this.append(new vm.JumpUnlessOpcode(this.labelFor(target)));
  }
}

function isCompilableExpression<E>(expr: Represents<E>): expr is CompilesInto<E> {
  return expr && typeof expr['compile'] === 'function';
}

export default class OpcodeBuilder extends BasicOpcodeBuilder {
  compile<E>(expr: Represents<E>): E {
    if (isCompilableExpression(expr)) {
      return expr.compile(this);
    } else {
      return expr;
    }
  }

  bindPositionalArgsForBlock(block: InlineBlock) {
    this.append(vm.BindPositionalArgsOpcode.create(block));
  }

  preludeForLayout(layout: Layout) {
    if (layout.hasNamedParameters) {
      this.append(vm.BindNamedArgsOpcode.create(layout));
    }

    if (layout.hasYields || layout.hasPartials) {
      this.append(new vm.BindCallerScopeOpcode());
    }

    if (layout.hasYields) {
      this.append(vm.BindBlocksOpcode.create(layout));
    }

    if (layout.hasPartials) {
      this.append(vm.BindPartialArgsOpcode.create(layout));
    }
  }

  // TODO
  // come back to this
  block(args: Option<Syntax.Args>, callback: BlockCallback) {
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
