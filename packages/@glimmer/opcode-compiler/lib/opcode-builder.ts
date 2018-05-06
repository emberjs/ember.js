import {
  Opaque,
  Option,
  Recast,
  VMHandle,
  ComponentCapabilities,
  CompilableTemplate,
  CompilableBlock,
  CompilableProgram,
  CompileTimeConstants,
  CompileTimeLazyConstants,
  STDLib,
  SymbolTable,
  Compiler,
  LayoutWithContext,
} from '@glimmer/interfaces';
import { dict, EMPTY_ARRAY, expect, Stack, unreachable } from '@glimmer/util';
import { Op, Register } from '@glimmer/vm';
import * as WireFormat from '@glimmer/wire-format';
import { SerializedInlineBlock } from '@glimmer/wire-format';
import { PrimitiveType } from '@glimmer/program';

import { Primitive } from './interfaces';

import { ATTRS_BLOCK, Compilers, expressionCompiler } from './syntax';

import {
  PLACEHOLDER_HANDLE,
  CompilableBlock as CompilableBlockInstance,
} from './compilable-template';

import { ComponentBuilder } from './wrapped-component';
import { InstructionEncoder, Operand, OpcodeSize } from '@glimmer/encoder';
import { ContentType } from '../../runtime/lib/compiled/opcodes/content';

export type Label = string;

export type When = (match: number, callback: () => void) => void;

class Labels {
  labels = dict<number>();
  targets: Array<{ at: number; target: string }> = [];

  label(name: string, index: number) {
    this.labels[name] = index;
  }

  target(at: number, target: string) {
    this.targets.push({ at, target });
  }

  patch(encoder: InstructionEncoder): void {
    let { targets, labels } = this;
    for (let i = 0; i < targets.length; i++) {
      let { at, target } = targets[i];
      let address = labels[target] - at;
      encoder.patch(at, address);
    }
  }
}

export interface Blocks {
  main: Option<CompilableBlock>;
  else: Option<CompilableBlock>;
  attrs: Option<CompilableBlock>;
}

export interface OpcodeBuilderConstructor {
  new <Locator>(compiler: Compiler, containingLayout: LayoutWithContext): OpcodeBuilder<Locator>;
}

export class StdOpcodeBuilder {
  static build(compiler: Compiler, callback: (builder: StdOpcodeBuilder) => void): number {
    let builder = new StdOpcodeBuilder(compiler);
    callback(builder);
    return builder.commit();
  }

  protected encoder = new InstructionEncoder([]);

  public compiler: Compiler<this>;
  private labelsStack = new Stack<Labels>();

  constructor(compiler: Compiler, protected size = 0) {
    this.compiler = compiler as Compiler<this>;
  }

  push(name: Op): void;
  push(name: Op, arg1: Operand): void;
  push(name: Op, arg1: Operand, arg2: Operand): void;
  push(name: Op, arg1: Operand, arg2: Operand, arg3: Operand): void;
  push(name: Op) {
    switch (arguments.length) {
      case 1:
        return this.encoder.encode(name, 0);
      case 2:
        return this.encoder.encode(name, 0, arguments[1]);
      case 3:
        return this.encoder.encode(name, 0, arguments[1], arguments[2]);
      default:
        return this.encoder.encode(name, 0, arguments[1], arguments[2], arguments[3]);
    }
  }

  pushMachine(name: Op): void;
  pushMachine(name: Op, arg1: Operand): void;
  pushMachine(name: Op, arg1: Operand, arg2: Operand): void;
  pushMachine(name: Op, arg1: Operand, arg2: Operand, arg3: Operand): void;
  pushMachine(name: Op) {
    switch (arguments.length) {
      case 1:
        return this.encoder.encode(name, OpcodeSize.MACHINE_MASK);
      case 2:
        return this.encoder.encode(name, OpcodeSize.MACHINE_MASK, arguments[1]);
      case 3:
        return this.encoder.encode(name, OpcodeSize.MACHINE_MASK, arguments[1], arguments[2]);
      default:
        return this.encoder.encode(
          name,
          OpcodeSize.MACHINE_MASK,
          arguments[1],
          arguments[2],
          arguments[3]
        );
    }
  }

  commit(): number {
    this.pushMachine(Op.Return);
    return this.compiler.commit(this.size, this.encoder.buffer);
  }

  reserve(name: Op) {
    this.encoder.encode(name, 0, -1);
  }

  reserveWithOperand(name: Op, operand: number) {
    this.encoder.encode(name, 0, -1, operand);
  }

  reserveMachine(name: Op) {
    this.encoder.encode(name, OpcodeSize.MACHINE_MASK, -1);
  }

  ///

  main() {
    this.push(Op.Main, Register.s0);
    this.invokePreparedComponent(false, false, true);
  }

  appendHTML() {
    this.push(Op.AppendHTML);
  }

  appendSafeHTML() {
    this.push(Op.AppendSafeHTML);
  }

  appendDocumentFragment() {
    this.push(Op.AppendDocumentFragment);
  }

  appendNode() {
    this.push(Op.AppendNode);
  }

  appendText() {
    this.push(Op.AppendText);
  }

  beginComponentTransaction() {
    this.push(Op.BeginComponentTransaction);
  }

  commitComponentTransaction() {
    this.push(Op.CommitComponentTransaction);
  }

  pushDynamicScope() {
    this.push(Op.PushDynamicScope);
  }

  popDynamicScope() {
    this.push(Op.PopDynamicScope);
  }

  pushRemoteElement() {
    this.push(Op.PushRemoteElement);
  }

  popRemoteElement() {
    this.push(Op.PopRemoteElement);
  }

  pushRootScope(symbols: number, bindCallerScope: boolean) {
    this.push(Op.RootScope, symbols, bindCallerScope ? 1 : 0);
  }

  pushVirtualRootScope(register: Register) {
    this.push(Op.VirtualRootScope, register);
  }

  pushChildScope() {
    this.push(Op.ChildScope);
  }

  popScope() {
    this.push(Op.PopScope);
  }

  prepareArgs(state: Register) {
    this.push(Op.PrepareArgs, state);
  }

  createComponent(state: Register, hasDefault: boolean) {
    let flag = (hasDefault as any) | 0;
    this.push(Op.CreateComponent, flag, state);
  }

  registerComponentDestructor(state: Register) {
    this.push(Op.RegisterComponentDestructor, state);
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

  setupForEval(state: Register) {
    this.push(Op.SetupForEval, state);
  }

  invokeComponentLayout(state: Register) {
    this.push(Op.InvokeComponentLayout, state);
  }

  didCreateElement(state: Register) {
    this.push(Op.DidCreateElement, state);
  }

  didRenderLayout(state: Register) {
    this.push(Op.DidRenderLayout, state);
  }

  pushFrame() {
    this.pushMachine(Op.PushFrame);
  }

  popFrame() {
    this.pushMachine(Op.PopFrame);
  }

  pushSmallFrame() {
    this.pushMachine(Op.PushSmallFrame);
  }

  popSmallFrame() {
    this.pushMachine(Op.PopSmallFrame);
  }

  invokeVirtual(): void {
    this.pushMachine(Op.InvokeVirtual);
  }

  invokeYield(): void {
    this.push(Op.InvokeYield);
  }

  toBoolean() {
    this.push(Op.ToBoolean);
  }

  invokePreparedComponent(
    hasBlock: boolean,
    bindableBlocks: boolean,
    bindableAtNames: boolean,
    populateLayout: Option<() => void> = null
  ) {
    this.beginComponentTransaction();
    this.pushDynamicScope();

    this.createComponent(Register.s0, hasBlock);

    // this has to run after createComponent to allow
    // for late-bound layouts, but a caller is free
    // to populate the layout earlier if it wants to
    // and do nothing here.
    if (populateLayout) populateLayout();

    this.registerComponentDestructor(Register.s0);

    this.getComponentSelf(Register.s0);

    this.pushVirtualRootScope(Register.s0);
    this.setVariable(0);
    this.setupForEval(Register.s0);
    if (bindableAtNames) this.setNamedVariables(Register.s0);
    if (bindableBlocks) this.setBlocks(Register.s0);
    this.pop();
    this.invokeComponentLayout(Register.s0);
    this.didRenderLayout(Register.s0);
    this.popFrame();

    this.popScope();
    this.popDynamicScope();
    this.commitComponentTransaction();
  }

  protected get pos(): number {
    return this.encoder.typePos;
  }

  protected get nextPos(): number {
    return this.encoder.size;
  }

  ///

  compileInline(sexp: WireFormat.Statements.Append) {
    return this.compiler.compileInline(sexp, this);
  }

  compileBlock(
    name: string,
    params: WireFormat.Core.Params,
    hash: WireFormat.Core.Hash,
    template: Option<CompilableBlock>,
    inverse: Option<CompilableBlock>
  ): void {
    this.compiler.compileBlock(name, params, hash, template, inverse, this);
  }

  label(name: string) {
    this.labels.label(name, this.nextPos);
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
    label.patch(this.encoder);
  }

  // components

  pushCurriedComponent() {
    this.push(Op.PushCurriedComponent);
  }

  pushDynamicComponentInstance() {
    this.push(Op.PushDynamicComponentInstance);
  }

  // dom

  openDynamicElement() {
    this.push(Op.OpenDynamicElement);
  }

  flushElement() {
    this.push(Op.FlushElement);
  }

  closeElement() {
    this.push(Op.CloseElement);
  }

  // lists

  putIterator() {
    this.push(Op.PutIterator);
  }

  enterList(start: string) {
    this.reserve(Op.EnterList);
    this.labels.target(this.pos, start);
  }

  exitList() {
    this.push(Op.ExitList);
  }

  iterate(breaks: string) {
    this.reserve(Op.Iterate);
    this.labels.target(this.pos, breaks);
  }

  // expressions

  setNamedVariables(state: Register) {
    this.push(Op.SetNamedVariables, state);
  }

  setBlocks(state: Register) {
    this.push(Op.SetBlocks, state);
  }

  setVariable(symbol: number) {
    this.push(Op.SetVariable, symbol);
  }

  setBlock(symbol: number) {
    this.push(Op.SetBlock, symbol);
  }

  getVariable(symbol: number) {
    this.push(Op.GetVariable, symbol);
  }

  getBlock(symbol: number) {
    this.push(Op.GetBlock, symbol);
  }

  hasBlock(symbol: number) {
    this.push(Op.HasBlock, symbol);
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

  returnTo(label: string) {
    this.reserveMachine(Op.ReturnTo);
    this.labels.target(this.pos, label);
  }

  primitiveReference() {
    this.push(Op.PrimitiveReference);
  }

  reifyU32() {
    this.push(Op.ReifyU32);
  }

  enter(args: number) {
    this.push(Op.Enter, args);
  }

  exit() {
    this.push(Op.Exit);
  }

  return() {
    this.pushMachine(Op.Return);
  }

  jump(target: string) {
    this.reserveMachine(Op.Jump);
    this.labels.target(this.pos, target);
  }

  jumpIf(target: string) {
    this.reserve(Op.JumpIf);
    this.labels.target(this.pos, target);
  }

  jumpUnless(target: string) {
    this.reserve(Op.JumpUnless);
    this.labels.target(this.pos, target);
  }

  jumpEq(value: number, target: string) {
    this.reserveWithOperand(Op.JumpEq, value);
    this.labels.target(this.pos, target);
  }

  assertSame() {
    this.push(Op.AssertSame);
  }

  pushEmptyArgs() {
    this.push(Op.PushEmptyArgs);
  }

  switch(_opcode: void, callback: (when: When) => void) {
    // Setup the switch DSL
    let clauses: Array<{ match: number; label: string; callback: () => void }> = [];

    let count = 0;

    function when(match: number, callback: () => void): void {
      clauses.push({ match, callback, label: `CLAUSE${count++}` });
    }

    // Call the callback
    callback(when);

    // Emit the opcodes for the switch
    this.enter(2);
    this.assertSame();
    this.reifyU32();

    this.startLabels();

    // First, emit the jump opcodes. We don't need a jump for the last
    // opcode, since it bleeds directly into its clause.
    clauses.slice(0, -1).forEach(clause => this.jumpEq(clause.match, clause.label));

    // Enumerate the clauses in reverse order. Earlier matches will
    // require fewer checks.
    for (let i = clauses.length - 1; i >= 0; i--) {
      let clause = clauses[i];

      this.label(clause.label);
      this.pop(2);

      clause.callback();

      // The first match is special: it is placed directly before the END
      // label, so no additional jump is needed at the end of it.
      if (i !== 0) {
        this.jump('END');
      }
    }

    this.label('END');

    this.stopLabels();

    this.exit();
  }

  stdAppend(trusting: boolean) {
    this.switch(this.contentType(), when => {
      when(ContentType.String, () => {
        if (trusting) {
          this.assertSame();
          this.appendHTML();
        } else {
          this.appendText();
        }
      });

      when(ContentType.Component, () => {
        this.pushCurriedComponent();
        this.pushDynamicComponentInstance();
        this.invokeBareComponent();
      });

      when(ContentType.SafeString, () => {
        this.assertSame();
        this.appendSafeHTML();
      });

      when(ContentType.Fragment, () => {
        this.assertSame();
        this.appendDocumentFragment();
      });

      when(ContentType.Node, () => {
        this.assertSame();
        this.appendNode();
      });
    });
  }

  populateLayout(state: number) {
    this.push(Op.PopulateLayout, state);
  }

  invokeBareComponent() {
    this.fetch(Register.s0);
    this.dup(Register.sp, 1);
    this.load(Register.s0);

    this.pushFrame();
    this.pushEmptyArgs();
    this.prepareArgs(Register.s0);

    this.invokePreparedComponent(false, false, true, () => {
      this.getComponentLayout(Register.s0);
      this.populateLayout(Register.s0);
    });

    this.load(Register.s0);
  }

  isComponent() {
    this.push(Op.IsComponent);
  }

  contentType() {
    this.push(Op.ContentType);
  }

  pushBlockScope(): void {
    this.push(Op.PushBlockScope);
  }
}

export type VMHandlePlaceholder = [number, () => VMHandle];

export abstract class OpcodeBuilder<Locator = Opaque> extends StdOpcodeBuilder {
  public constants: CompileTimeConstants;
  public stdLib: STDLib;
  public component: ComponentBuilder<Locator> = new ComponentBuilder(this);

  private expressionCompiler: Compilers<WireFormat.TupleExpression> = expressionCompiler();
  private isComponentAttrs = false;

  constructor(compiler: Compiler, public containingLayout: LayoutWithContext<Locator>) {
    super(compiler, containingLayout ? containingLayout.block.symbols.length : 0);
    this.constants = compiler.constants;
    this.stdLib = compiler.stdLib;
  }

  abstract pushBlock(block: Option<CompilableBlock>): void;
  abstract resolveBlock(): void;
  abstract pushLayout(layout: Option<CompilableProgram>): void;
  abstract invokeStatic(block: CompilableTemplate): void;
  abstract resolveLayout(): void;

  /// MECHANICS

  get referrer(): Locator {
    return this.containingLayout && this.containingLayout.referrer;
  }

  setComponentAttrs(enabled: boolean): void {
    this.isComponentAttrs = enabled;
  }

  expr(expression: WireFormat.Expression) {
    if (Array.isArray(expression)) {
      this.expressionCompiler.compile(expression, this);
    } else {
      this.pushPrimitiveReference(expression);
    }
  }

  ///

  // args

  pushArgs(names: string[], flags: number): void {
    let serialized = this.constants.stringArray(names);
    this.push(Op.PushArgs, serialized, flags);
  }

  pushYieldableBlock(block: Option<CompilableBlock>): void {
    this.pushSymbolTable(block && block.symbolTable);
    this.pushBlockScope();
    this.pushBlock(block);
  }

  curryComponent(
    definition: WireFormat.Expression,
    /* TODO: attrs: Option<RawInlineBlock>, */ params: Option<WireFormat.Core.Params>,
    hash: WireFormat.Core.Hash,
    synthetic: boolean
  ) {
    let referrer = this.containingLayout.referrer;

    this.pushFrame();
    this.compileArgs(params, hash, null, synthetic);
    this.push(Op.CaptureArgs);
    this.expr(definition);
    this.push(Op.CurryComponent, this.constants.serializable(referrer));
    this.popFrame();
    this.fetch(Register.v0);
  }

  pushSymbolTable(table: Option<SymbolTable>): void {
    if (table) {
      let constant = this.constants.serializable(table);
      this.push(Op.PushSymbolTable, constant);
    } else {
      this.primitive(null);
    }
  }

  invokeComponent(
    capabilities: ComponentCapabilities | true,
    attrs: Option<CompilableBlock>,
    params: Option<WireFormat.Core.Params>,
    hash: WireFormat.Core.Hash,
    synthetic: boolean,
    block: Option<CompilableBlock>,
    inverse: Option<CompilableBlock> = null,
    layout?: CompilableProgram
  ) {
    this.fetch(Register.s0);
    this.dup(Register.sp, 1);
    this.load(Register.s0);

    this.pushFrame();

    let bindableBlocks = !!(block || inverse || attrs);
    let bindableAtNames =
      capabilities === true || capabilities.prepareArgs || !!(hash && hash[0].length !== 0);

    let blocks = { main: block, else: inverse, attrs };

    this.compileArgs(params, hash, blocks, synthetic);
    this.prepareArgs(Register.s0);

    this.invokePreparedComponent(block !== null, bindableBlocks, bindableAtNames, () => {
      if (layout) {
        this.pushSymbolTable(layout.symbolTable);
        this.pushLayout(layout);
        this.resolveLayout();
      } else {
        this.getComponentLayout(Register.s0);
      }

      this.populateLayout(Register.s0);
    });

    this.load(Register.s0);
  }

  invokeStaticComponent(
    capabilities: ComponentCapabilities,
    layout: CompilableProgram,
    attrs: Option<CompilableBlock>,
    params: Option<WireFormat.Core.Params>,
    hash: WireFormat.Core.Hash,
    synthetic: boolean,
    block: Option<CompilableBlock>,
    inverse: Option<CompilableBlock> = null
  ) {
    let { symbolTable } = layout;

    let bailOut = symbolTable.hasEval || capabilities.prepareArgs;

    if (bailOut) {
      this.invokeComponent(capabilities, attrs, params, hash, synthetic, block, inverse, layout);
      return;
    }

    this.fetch(Register.s0);
    this.dup(Register.sp, 1);
    this.load(Register.s0);

    let { symbols } = symbolTable;

    if (capabilities.createArgs) {
      this.pushFrame();
      this.compileArgs(null, hash, null, synthetic);
    }

    this.beginComponentTransaction();

    if (capabilities.dynamicScope) {
      this.pushDynamicScope();
    }

    if (capabilities.createInstance) {
      this.createComponent(Register.s0, block !== null);
    }

    if (capabilities.createArgs) {
      this.popFrame();
    }

    this.pushFrame();

    this.registerComponentDestructor(Register.s0);

    let bindings: { symbol: number; isBlock: boolean }[] = [];

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
            this.pushYieldableBlock(null);
            bindings.push({ symbol: i + 1, isBlock: true });
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
            this.expr(values[index]);
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

    this.invokeStatic(layout);

    if (capabilities.createInstance) {
      this.didRenderLayout(Register.s0);
    }

    this.popFrame();

    this.popScope();

    if (capabilities.dynamicScope) {
      this.popDynamicScope();
    }

    this.commitComponentTransaction();

    this.load(Register.s0);
  }

  dynamicComponent(
    definition: WireFormat.Expression,
    /* TODO: attrs: Option<RawInlineBlock>, */ params: Option<WireFormat.Core.Params>,
    hash: WireFormat.Core.Hash,
    synthetic: boolean,
    block: Option<CompilableBlock>,
    inverse: Option<CompilableBlock> = null
  ) {
    this.replayable({
      args: () => {
        this.expr(definition);
        this.dup();
        return 2;
      },

      body: () => {
        this.jumpUnless('ELSE');

        this.resolveDynamicComponent(this.containingLayout.referrer);

        this.pushDynamicComponentInstance();

        this.invokeComponent(true, null, params, hash, synthetic, block, inverse);

        this.label('ELSE');
      },
    });
  }

  yield(to: number, params: Option<WireFormat.Core.Params>) {
    this.compileArgs(params, null, null, false);
    this.getBlock(to);
    this.resolveBlock();
    this.invokeYield();
    this.popScope();
    this.popFrame();
  }

  guardedAppend(expression: WireFormat.Expression, trusting: boolean) {
    this.pushFrame();

    this.expr(expression);

    this.pushMachine(Op.InvokeStatic, this.stdLib.getAppend(trusting));

    this.popFrame();
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
    this.invokeVirtual();

    if (count) {
      this.popScope();
    }

    this.popFrame();
  }

  /// CONVENIENCE

  // internal helpers

  string(_string: string): number {
    return this.constants.string(_string);
  }

  protected names(_names: string[]): number {
    let names: number[] = [];

    for (let i = 0; i < _names.length; i++) {
      let n = _names[i];
      names[i] = this.constants.string(n);
    }

    return this.constants.array(names);
  }

  protected symbols(symbols: number[]): number {
    return this.constants.array(symbols);
  }

  // vm

  primitive(_primitive: Primitive) {
    let type: PrimitiveType = PrimitiveType.NUMBER;
    let primitive: number;
    switch (typeof _primitive) {
      case 'number':
        if ((_primitive as number) % 1 === 0) {
          if ((_primitive as number) > -1) {
            primitive = _primitive as number;
          } else {
            primitive = this.constants.number(_primitive as number);
            type = PrimitiveType.NEGATIVE;
          }
        } else {
          primitive = this.constants.number(_primitive as number);
          type = PrimitiveType.FLOAT;
        }
        break;
      case 'string':
        primitive = this.string(_primitive as string);
        type = PrimitiveType.STRING;
        break;
      case 'boolean':
        primitive = (_primitive as any) | 0;
        type = PrimitiveType.BOOLEAN_OR_VOID;
        break;
      case 'object':
        // assume null
        primitive = 2;
        type = PrimitiveType.BOOLEAN_OR_VOID;
        break;
      case 'undefined':
        primitive = 3;
        type = PrimitiveType.BOOLEAN_OR_VOID;
        break;
      default:
        throw new Error('Invalid primitive passed to pushPrimitive');
    }

    let immediate = this.sizeImmediate((primitive << 3) | type, primitive);
    this.push(Op.Primitive, immediate);
  }

  sizeImmediate(shifted: number, primitive: number) {
    if (shifted >= OpcodeSize.MAX_SIZE || shifted < 0) {
      return (this.constants.number(primitive) << 3) | PrimitiveType.BIG_NUM;
    }

    return shifted;
  }

  pushPrimitiveReference(primitive: Primitive) {
    this.primitive(primitive);
    this.primitiveReference();
  }

  // components

  pushComponentDefinition(handle: number) {
    this.push(Op.PushComponentDefinition, this.constants.handle(handle));
  }

  resolveDynamicComponent(referrer: Locator) {
    this.push(Op.ResolveDynamicComponent, this.constants.serializable(referrer));
  }

  staticComponentHelper(
    tag: string,
    hash: WireFormat.Core.Hash,
    template: Option<CompilableBlock>
  ) {
    let { handle, capabilities, compilable } = this.compiler.resolveLayoutForTag(
      tag,
      this.referrer
    );

    if (handle !== null && capabilities !== null) {
      if (compilable) {
        if (hash) {
          for (let i = 0; i < hash.length; i = i + 2) {
            hash[i][0] = `@${hash[i][0]}`;
          }
        }

        this.pushComponentDefinition(handle);
        this.invokeStaticComponent(
          capabilities,
          compilable,
          null,
          null,
          hash,
          false,
          template && template
        );
        return true;
      }
    }

    return false;
  }

  // partial

  invokePartial(referrer: Locator, symbols: string[], evalInfo: number[]) {
    let _meta = this.constants.serializable(referrer);
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

  // dom

  text(text: string) {
    this.push(Op.Text, this.constants.string(text));
  }

  openPrimitiveElement(tag: string) {
    this.push(Op.OpenElement, this.constants.string(tag));
  }

  modifier(
    locator: Locator,
    params: Option<WireFormat.Core.Params>,
    hash: Option<WireFormat.Core.Hash>
  ) {
    this.pushFrame();
    this.compileArgs(params, hash, null, true);
    this.push(Op.Modifier, this.constants.handle(locator));
    this.popFrame();
  }

  comment(_comment: string) {
    let comment = this.constants.string(_comment);
    this.push(Op.Comment, comment);
  }

  dynamicAttr(_name: string, _namespace: Option<string>, trusting: boolean) {
    let name = this.constants.string(_name);
    let namespace = _namespace ? this.constants.string(_namespace) : 0;

    if (this.isComponentAttrs) {
      this.push(Op.ComponentAttr, name, trusting === true ? 1 : 0, namespace);
    } else {
      this.push(Op.DynamicAttr, name, trusting === true ? 1 : 0, namespace);
    }
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

  // expressions

  hasBlockParams(to: number) {
    this.getBlock(to);
    this.resolveBlock();
    this.push(Op.HasBlockParams);
  }

  getProperty(key: string) {
    this.push(Op.GetProperty, this.string(key));
  }

  helper(
    helper: Locator,
    params: Option<WireFormat.Core.Params>,
    hash: Option<WireFormat.Core.Hash>
  ) {
    this.pushFrame();
    this.compileArgs(params, hash, null, true);
    this.push(Op.Helper, this.constants.handle(helper));
    this.popFrame();
    this.fetch(Register.v0);
  }

  bindDynamicScope(_names: string[]) {
    this.push(Op.BindDynamicScope, this.names(_names));
  }

  // convenience methods

  /**
   * A convenience for pushing some arguments on the stack and
   * running some code if the code needs to be re-executed during
   * updating execution if some of the arguments have changed.
   *
   * # Initial Execution
   *
   * The `args` function should push zero or more arguments onto
   * the stack and return the number of arguments pushed.
   *
   * The `body` function provides the instructions to execute both
   * during initial execution and during updating execution.
   *
   * Internally, this function starts by pushing a new frame, so
   * that the body can return and sets the return point ($ra) to
   * the ENDINITIAL label.
   *
   * It then executes the `args` function, which adds instructions
   * responsible for pushing the arguments for the block to the
   * stack. These arguments will be restored to the stack before
   * updating execution.
   *
   * Next, it adds the Enter opcode, which marks the current position
   * in the DOM, and remembers the current $pc (the next instruction)
   * as the first instruction to execute during updating execution.
   *
   * Next, it runs `body`, which adds the opcodes that should
   * execute both during initial execution and during updating execution.
   * If the `body` wishes to finish early, it should Jump to the
   * `FINALLY` label.
   *
   * Next, it adds the FINALLY label, followed by:
   *
   * - the Exit opcode, which finalizes the marked DOM started by the
   *   Enter opcode.
   * - the Return opcode, which returns to the current return point
   *   ($ra).
   *
   * Finally, it adds the ENDINITIAL label followed by the PopFrame
   * instruction, which restores $fp, $sp and $ra.
   *
   * # Updating Execution
   *
   * Updating execution for this `replayable` occurs if the `body` added an
   * assertion, via one of the `JumpIf`, `JumpUnless` or `AssertSame` opcodes.
   *
   * If, during updating executon, the assertion fails, the initial VM is
   * restored, and the stored arguments are pushed onto the stack. The DOM
   * between the starting and ending markers is cleared, and the VM's cursor
   * is set to the area just cleared.
   *
   * The return point ($ra) is set to -1, the exit instruction.
   *
   * Finally, the $pc is set to to the instruction saved off by the
   * Enter opcode during initial execution, and execution proceeds as
   * usual.
   *
   * The only difference is that when a `Return` instruction is
   * encountered, the program jumps to -1 rather than the END label,
   * and the PopFrame opcode is not needed.
   */
  replayable({ args, body }: { args(): number; body(): void }): void {
    // Start a new label frame, to give END and RETURN
    // a unique meaning.
    this.startLabels();
    this.pushFrame();

    // If the body invokes a block, its return will return to
    // END. Otherwise, the return in RETURN will return to END.
    this.returnTo('ENDINITIAL');

    // Push the arguments onto the stack. The args() function
    // tells us how many stack elements to retain for re-execution
    // when updating.
    let count = args();

    // Start a new updating closure, remembering `count` elements
    // from the stack. Everything after this point, and before END,
    // will execute both initially and to update the block.
    //
    // The enter and exit opcodes also track the area of the DOM
    // associated with this block. If an assertion inside the block
    // fails (for example, the test value changes from true to false
    // in an #if), the DOM is cleared and the program is re-executed,
    // restoring `count` elements to the stack and executing the
    // instructions between the enter and exit.
    this.enter(count);

    // Evaluate the body of the block. The body of the block may
    // return, which will jump execution to END during initial
    // execution, and exit the updating routine.
    body();

    // All execution paths in the body should run the FINALLY once
    // they are done. It is executed both during initial execution
    // and during updating execution.
    this.label('FINALLY');

    // Finalize the DOM.
    this.exit();

    // In initial execution, this is a noop: it returns to the
    // immediately following opcode. In updating execution, this
    // exits the updating routine.
    this.return();

    // Cleanup code for the block. Runs on initial execution
    // but not on updating.
    this.label('ENDINITIAL');
    this.popFrame();
    this.stopLabels();
  }

  /**
   * A specialized version of the `replayable` convenience that allows the
   * caller to provide different code based upon whether the item at
   * the top of the stack is true or false.
   *
   * As in `replayable`, the `ifTrue` and `ifFalse` code can invoke `return`.
   *
   * During the initial execution, a `return` will continue execution
   * in the cleanup code, which finalizes the current DOM block and pops
   * the current frame.
   *
   * During the updating execution, a `return` will exit the updating
   * routine, as it can reuse the DOM block and is always only a single
   * frame deep.
   */
  replayableIf({ args, ifTrue, ifFalse }: { args(): number; ifTrue(): void; ifFalse?(): void }) {
    this.replayable({
      args,

      body: () => {
        // If the conditional is false, jump to the ELSE label.
        this.jumpUnless('ELSE');

        // Otherwise, execute the code associated with the true branch.
        ifTrue();

        // We're done, so return. In the initial execution, this runs
        // the cleanup code. In the updating VM, it exits the updating
        // routine.
        this.jump('FINALLY');

        this.label('ELSE');

        // If the conditional is false, and code associatied ith the
        // false branch was provided, execute it. If there was no code
        // associated with the false branch, jumping to the else statement
        // has no other behavior.
        if (ifFalse) {
          ifFalse();
        }
      },
    });
  }

  inlineBlock(block: SerializedInlineBlock): CompilableBlock {
    return new CompilableBlockInstance(this.compiler, {
      block,
      containingLayout: this.containingLayout,
    });
  }

  evalSymbols(): Option<string[]> {
    let {
      containingLayout: { block },
    } = this;

    return block.hasEval ? block.symbols : null;
  }

  compileParams(params: Option<WireFormat.Core.Params>) {
    if (!params) return 0;

    for (let i = 0; i < params.length; i++) {
      this.expr(params[i]);
    }

    return params.length;
  }

  compileArgs(
    params: Option<WireFormat.Core.Params>,
    hash: Option<WireFormat.Core.Hash>,
    blocks: Option<Blocks>,
    synthetic: boolean
  ): void {
    if (blocks) {
      this.pushYieldableBlock(blocks.main);
      this.pushYieldableBlock(blocks.else);
      this.pushYieldableBlock(blocks.attrs);
    }

    let count = this.compileParams(params);

    let flags = count << 4;

    if (synthetic) flags |= 0b1000;

    if (blocks) {
      flags |= 0b111;
    }

    let names: string[] = EMPTY_ARRAY;

    if (hash) {
      names = hash[0];
      let val = hash[1];
      for (let i = 0; i < val.length; i++) {
        this.expr(val[i]);
      }
    }

    this.pushArgs(names, flags);
  }

  template(block: Option<WireFormat.SerializedInlineBlock>): Option<CompilableBlock> {
    if (!block) return null;

    return this.inlineBlock(block);
  }
}

export default OpcodeBuilder;

export class LazyOpcodeBuilder<Locator> extends OpcodeBuilder<Locator> {
  public constants: CompileTimeLazyConstants;

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

  pushLayout(layout: Option<CompilableProgram>) {
    if (layout) {
      this.pushOther(layout);
    } else {
      this.primitive(null);
    }
  }

  resolveLayout(): void {
    this.push(Op.CompileBlock);
  }

  invokeStatic(compilable: CompilableTemplate): void {
    this.pushOther(compilable);
    this.push(Op.CompileBlock);
    this.pushMachine(Op.InvokeVirtual);
  }

  protected pushOther<T>(value: T) {
    this.push(Op.Constant, this.other(value));
  }

  protected other(value: Opaque): number {
    return this.constants.other(value);
  }
}

export class EagerOpcodeBuilder<Locator> extends OpcodeBuilder<Locator> {
  pushBlock(block: Option<CompilableBlock>): void {
    let handle = block ? (block.compile() as Recast<VMHandle, number>) : null;
    this.primitive(handle);
  }

  resolveBlock(): void {
    return;
  }

  pushLayout(layout: Option<CompilableProgram>): void {
    if (layout) {
      this.primitive(layout.compile() as Recast<VMHandle, number>);
    } else {
      this.primitive(null);
    }
  }

  resolveLayout() {}

  invokeStatic(compilable: CompilableTemplate): void {
    let handle = compilable.compile();

    // If the handle for the invoked component is not yet known (for example,
    // because this is a recursive invocation and we're still compiling), push a
    // function that will produce the correct handle when the heap is
    // serialized.
    if (handle === PLACEHOLDER_HANDLE) {
      this.pushMachine(Op.InvokeStatic, () => compilable.compile() as Recast<VMHandle, number>);
    } else {
      this.pushMachine(Op.InvokeStatic, handle as Recast<VMHandle, number>);
    }
  }
}
