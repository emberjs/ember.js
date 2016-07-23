import * as component from './component';
import * as content from './content';
import * as dom from './dom';
import * as lists from './lists';
import * as vm from './vm';
import * as Syntax from '../../syntax/core';

import { Stack, Dict, Opaque, InternedString, dict } from 'glimmer-util';
import { StatementCompilationBuffer } from '../../syntax';
import { Opcode, OpSeq } from '../../opcodes';
import { CompiledArgs } from '../expressions/args';
import { CompiledExpression } from '../expressions';
import { ComponentDefinition } from '../../component/interfaces';
import Environment from '../../environment';
import { InlineBlock, Layout, Block } from '../blocks';

interface CompilesInto<T> {
  compile(dsl: OpcodeBuilder, env: Environment, block: Block): T;
}

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

  getLocalSymbol(name: InternedString): number {
    return this.inner.getLocalSymbol(name);
  }

  hasLocalSymbol(name: InternedString): boolean {
    return this.inner.hasLocalSymbol(name);
  }

  getNamedSymbol(name: InternedString): number {
    return this.inner.getNamedSymbol(name);
  }

  hasNamedSymbol(name: InternedString): boolean {
    return this.inner.hasNamedSymbol(name);
  }

  getBlockSymbol(name: InternedString): number {
    return this.inner.getBlockSymbol(name);
  }

  hasBlockSymbol(name: InternedString): boolean {
    return this.inner.hasBlockSymbol(name);
  }

  // only used for {{view.name}}
  hasKeyword(name: InternedString): boolean {
    return this.inner.hasKeyword(name);
  }
}

export abstract class BasicOpcodeBuilder extends StatementCompilationBufferProxy {
  private labelsStack = new Stack<Dict<vm.LabelOpcode>>();
  private templatesStack = new Stack<Syntax.Templates>();

  constructor(inner: StatementCompilationBuffer, public _block: Block, public env: Environment) {
    super(inner);
  }

  abstract compile<E>(expr: CompilesInto<E>): E;

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

  labelFor(label: string): vm.LabelOpcode {
    let labels = this.labels;

    if (labels[label]) return labels[label];
    else return labels[label] = new vm.LabelOpcode(label);
  }

  // components

  putComponentDefinition(args: CompilesInto<CompiledArgs>, definition: ComponentDefinition<Opaque>) {
    this.append(new component.PutComponentDefinitionOpcode({ args: this.compile(args), definition }));
  }

  putDynamicComponentDefinition(args: CompilesInto<CompiledArgs>) {
    this.append(new component.PutDynamicComponentDefinitionOpcode({ args: this.compile(args) }));
  }

  openComponent(shadow: InternedString[]) {
    this.append(new component.OpenComponentOpcode({ shadow, templates: this.templates }));
  }

  didCreateElement() {
    this.append(new component.DidCreateElementOpcode());
  }

  shadowAttributes() {
    this.append(new component.ShadowAttributesOpcode());
  }

  closeComponent() {
    this.append(new component.CloseComponentOpcode());
  }

  // content

  cautiousAppend() {
    this.append(new content.CautiousAppendOpcode());
  }

  trustingAppend() {
    this.append(new content.TrustingAppendOpcode());
  }

  // dom

  text(text: InternedString) {
    this.append(new dom.TextOpcode({ text }));
  }

  openPrimitiveElement(tag: InternedString) {
    this.append(new dom.OpenPrimitiveElementOpcode({ tag }));
  }

  openDynamicPrimitiveElement() {
    this.append(new dom.OpenDynamicPrimitiveElementOpcode());
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

  comment(comment: InternedString) {
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

  putValue(expression: CompilesInto<CompiledExpression<Opaque>>) {
    this.append(new vm.PutValueOpcode({ expression: this.compile(expression) }));
  }

  putArgs(args: CompilesInto<CompiledArgs>) {
    this.append(new vm.PutArgsOpcode({ args: this.compile(args) }));
  }

  bindPositionalArgs(block: InlineBlock) {
    this.append(new vm.BindPositionalArgsOpcode({ block }));
  }

  bindNamedArgs(named: Dict<number>) {
    this.append(new vm.BindNamedArgsOpcode({ named }));
  }

  bindBlocks(blocks: Dict<number>) {
    this.append(new vm.BindBlocksOpcode({ blocks }));
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

  test() {
    this.append(new vm.TestOpcode());
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

export default class OpcodeBuilder extends BasicOpcodeBuilder {
  compile<E>(expr: CompilesInto<E>): E {
    return expr.compile(this, this.env, this._block);
  }

  setupDynamicScope(callback: vm.BindDynamicScopeCallback) {
    this.pushDynamicScope();
    this.bindDynamicScope(callback);
  }

  bindNamedArgsForLayout(layout: Layout) {
    this.append(vm.BindNamedArgsOpcode.create(layout));
  }

  bindBlocksForLayout(layout: Layout) {
    this.append(vm.BindBlocksOpcode.create(layout));
  }

  block({ templates, args }, callback: BlockCallback) {
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

  iter({ templates }, callback: BlockCallback) {
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
