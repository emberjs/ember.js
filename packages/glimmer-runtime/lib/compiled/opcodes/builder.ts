import * as component from './component';
import * as content from './content';
import * as dom from './dom';
import * as lists from './lists';
import * as vm from './vm';
import * as Syntax from '../../syntax/core';

import { Stack, Dict, Opaque, dict } from 'glimmer-util';
import { StatementCompilationBuffer } from '../../syntax';
import { Opcode, OpSeq } from '../../opcodes';
import { CompiledArgs } from '../expressions/args';
import { CompiledExpression } from '../expressions';
import { ComponentDefinition } from '../../component/interfaces';
import Environment from '../../environment';
import { InlineBlock, Layout, Block } from '../blocks';
import { EMPTY_ARRAY } from '../../utils';

interface CompilesInto<T> {
  compile(dsl: OpcodeBuilder, env: Environment, block: Block): T;
}

type Represents<E> = CompilesInto<E> | E;

export type Label = string;

class StatementCompilationBufferProxy implements StatementCompilationBuffer {

  constructor(protected inner: StatementCompilationBuffer) {}

  get component() {
    return this.inner.component;
  }

  toOpSeq(): OpSeq {
    return this.inner.toOpSeq();
  }

  append<T extends Opcode>(opcode: T) {
    this.inner.append(opcode);
  }

  getLocalSymbol(name: string): number {
    return this.inner.getLocalSymbol(name);
  }

  hasLocalSymbol(name: string): boolean {
    return this.inner.hasLocalSymbol(name);
  }

  getNamedSymbol(name: string): number {
    return this.inner.getNamedSymbol(name);
  }

  hasNamedSymbol(name: string): boolean {
    return this.inner.hasNamedSymbol(name);
  }

  getBlockSymbol(name: string): number {
    return this.inner.getBlockSymbol(name);
  }

  hasBlockSymbol(name: string): boolean {
    return this.inner.hasBlockSymbol(name);
  }
}

export abstract class BasicOpcodeBuilder extends StatementCompilationBufferProxy {
  private labelsStack = new Stack<Dict<vm.LabelOpcode>>();
  private templatesStack = new Stack<Syntax.Templates>();

  constructor(inner: StatementCompilationBuffer, public _block: Block, public env: Environment) {
    super(inner);
  }

  abstract compile<E>(expr: Represents<E>): E;

  // helpers

  get labels() {
    return this.labelsStack.current;
  }

  get templates() {
    return this.templatesStack.current;
  }

  startBlock({ templates }: { templates: Syntax.Templates }) {
    this.templatesStack.push(templates);
  }

  endBlock() {
    this.templatesStack.pop();
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

  // components

  putComponentDefinition(definition: ComponentDefinition<Opaque>) {
    this.append(new component.PutComponentDefinitionOpcode(definition));
  }

  putDynamicComponentDefinition() {
    this.append(new component.PutDynamicComponentDefinitionOpcode());
  }

  openComponent(args: Represents<CompiledArgs>, shadow: string[] = EMPTY_ARRAY) {
    this.append(new component.OpenComponentOpcode(this.compile(args), shadow, this.templates));
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
    this.append(new dom.TextOpcode({ text }));
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

  staticAttr(options: dom.StaticAttrOptions) {
    this.append(new dom.StaticAttrOpcode(options));
  }

  dynamicAttrNS(options: dom.DynamicAttrNSOptions) {
    this.append(new dom.DynamicAttrNSOpcode(options));
  }

  dynamicAttr(options: dom.SimpleAttrOptions) {
    this.append(new dom.DynamicAttrOpcode(options));
  }

  comment(comment: string) {
    this.append(new dom.CommentOpcode({ comment }));
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
    this.append(new vm.PutValueOpcode({ expression: this.compile(expression) }));
  }

  putArgs(args: Represents<CompiledArgs>) {
    this.append(new vm.PutArgsOpcode({ args: this.compile(args) }));
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

  bindDynamicScope(callback: vm.BindDynamicScopeCallback) {
    this.append(new vm.BindDynamicScopeOpcode(callback));
  }

  enter(enter: Label, exit: Label) {
    this.append(new vm.EnterOpcode({ begin: this.labelFor(enter), end: this.labelFor(exit) }));
  }

  exit() {
    this.append(new vm.ExitOpcode());
  }

  evaluate(name: string, block = this.templates[name]) {
    this.append(new vm.EvaluateOpcode({ debug: name, block }));
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
    this.append(new vm.JumpOpcode({ target: this.labelFor(target) }));
  }

  jumpIf(target: string) {
    this.append(new vm.JumpIfOpcode({ target: this.labelFor(target) }));
  }

  jumpUnless(target: string) {
    this.append(new vm.JumpUnlessOpcode({ target: this.labelFor(target) }));
  }
}

function isCompilableExpression<E>(expr: Represents<E>): expr is CompilesInto<E> {
  return expr && typeof expr['compile'] === 'function';
}

type BlockArgs = { templates: Syntax.Templates, args?: Syntax.Args };

const SIMPLE_BLOCK: BlockArgs = { templates: null };

export default class OpcodeBuilder extends BasicOpcodeBuilder {
  compile<E>(expr: Represents<E>): E {
    if (isCompilableExpression(expr)) {
      return expr.compile(this, this.env, this._block);
    } else {
      return expr;
    }
  }

  setupDynamicScope(callback: vm.BindDynamicScopeCallback) {
    this.pushDynamicScope();
    this.bindDynamicScope(callback);
  }

  bindPositionalArgsForBlock(block: InlineBlock) {
    this.append(vm.BindPositionalArgsOpcode.create(block));
  }

  bindNamedArgsForLayout(layout: Layout) {
    this.append(vm.BindNamedArgsOpcode.create(layout));
  }

  bindBlocksForLayout(layout: Layout) {
    this.append(vm.BindBlocksOpcode.create(layout));
  }

  simpleBlock(callback: BlockCallback) {
    this.block(SIMPLE_BLOCK, callback);
  }

  block({ templates, args }: BlockArgs, callback: BlockCallback) {
    this.startLabels();
    this.startBlock({ templates });
    this.enter('BEGIN', 'END');
    this.label('BEGIN');

    if (args) this.putArgs(args);

    callback(this, 'BEGIN', 'END');

    this.label('END');
    this.exit();
    this.endBlock();
    this.stopLabels();
  }

  iter({ templates }: { templates: Syntax.Templates }, callback: BlockCallback) {
    this.startLabels();
    this.startBlock({ templates });
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
    this.endBlock();
    this.stopLabels();
  }

  unit({ templates }: { templates: Syntax.Templates }, callback: (builder: OpcodeBuilder) => void) {
    this.startLabels();
    this.startBlock({ templates });
    callback(this);
    this.endBlock();
    this.stopLabels();
  }
}

export interface UnitOptions {
  templates: Syntax.Templates;
}

export interface BlockOptions extends UnitOptions {
  args: Syntax.Args;
}
export type BlockCallback = (dsl: OpcodeBuilder, BEGIN: Label, END: Label) => void;
