import {
  Opaque,
  Option,
  Recast,
  VMHandle,
  CompilableTemplate,
  CompilableBlock,
  CompilableProgram,
  CompileTimeConstants,
  CompileTimeLazyConstants,
  STDLib,
  SymbolTable,
  Compiler,
  LayoutWithContext,
  NamedBlocks,
} from '@glimmer/interfaces';
import { dict, EMPTY_ARRAY, expect, Stack } from '@glimmer/util';
import {
  Op,
  Register,
  $sp,
  $fp,
  $s0,
  $v0,
  MachineRegister,
  MachineOp,
  SavedRegister,
  $s1,
} from '@glimmer/vm';
import * as WireFormat from '@glimmer/wire-format';
import { SerializedInlineBlock, Expression } from '@glimmer/wire-format';
import { PrimitiveType } from '@glimmer/program';

import { Primitive, ComponentArgs } from './interfaces';

import { ATTRS_BLOCK, Compilers, expressionCompiler } from './syntax';

import {
  PLACEHOLDER_HANDLE,
  CompilableBlock as CompilableBlockInstance,
} from './compilable-template';

import { ComponentBuilderImpl } from './wrapped-component';
import { InstructionEncoder, Operand, OpcodeSize } from '@glimmer/encoder';
import { ContentType } from '../../runtime/lib/compiled/opcodes/content';
import { NamedBlocksImpl, EMPTY_BLOCKS } from './utils';
import OpcodeBuilder, {
  Block,
  When,
  StringOperand,
  BuilderOperand,
  BuilderOperands,
  HandleOperand,
  StaticComponent,
  Component,
  ArrayOperand,
  StringArrayOperand,
  CompileBlock,
  DynamicComponent,
  CurryComponent,
  CompileHelper,
} from './opcode-builder-interfaces';
import { DEBUG } from '@glimmer/local-debug-flags';
import { debugCompiler, AnyAbstractCompiler } from './compiler';

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

export const constant = {
  string(value: string): StringOperand {
    return { type: 'string', value };
  },

  array(value: number[]): ArrayOperand {
    return { type: 'array', value };
  },

  stringArray(value: string[]): StringArrayOperand {
    return { type: 'string-array', value };
  },

  handle(value: number): HandleOperand {
    return { type: 'handle', value };
  },
};

class Encoder {
  constructor(private encoder: InstructionEncoder, private constants: CompileTimeConstants) {}

  push(name: Op, ...args: BuilderOperands): void {
    switch (arguments.length) {
      case 1:
        return this.encoder.encode(name, 0);
      case 2:
        return this.encoder.encode(name, 0, this.operand(args[0]));
      case 3:
        return this.encoder.encode(name, 0, this.operand(args[0]), this.operand(args[1]));
      default:
        return this.encoder.encode(
          name,
          0,
          this.operand(args[0]),
          this.operand(args[1]),
          this.operand(args[2])
        );
    }
  }

  pushMachine(
    name: MachineOp,
    ...args: [] | [Operand] | [Operand, Operand] | [Operand, Operand, Operand]
  ): void;
  pushMachine(name: MachineOp) {
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

  private operand(operand: BuilderOperand): number {
    if (typeof operand === 'number') {
      return operand;
    }

    switch (operand.type) {
      case 'string':
        return this.constants.string(operand.value);
      case 'array':
        return this.constants.array(operand.value);
      case 'string-array':
        return this.constants.stringArray(operand.value);
      case 'handle':
        return this.constants.handle(operand.value);
    }
  }
}

export class StdOpcodeBuilder {
  static build(compiler: Compiler, callback: (builder: StdOpcodeBuilder) => void): number {
    let builder = new StdOpcodeBuilder(compiler);
    callback(builder);
    return builder.commit();
  }

  readonly constants: CompileTimeConstants;
  protected instructionEncoder = new InstructionEncoder([]);
  protected encoder: Encoder;

  public compiler: Compiler<this>;
  private labelsStack = new Stack<Labels>();

  constructor(compiler: Compiler, protected size = 0) {
    this.compiler = compiler as Compiler<this>;
    this.constants = compiler.constants;
    this.encoder = new Encoder(this.instructionEncoder, this.constants);
  }

  commit(): number {
    this.encoder.pushMachine(MachineOp.Return);
    return this.compiler.commit(this.size, this.instructionEncoder.buffer);
  }

  reserve(name: Op) {
    this.instructionEncoder.encode(name, 0, -1);
  }

  reserveWithOperand(name: Op, operand: number) {
    this.instructionEncoder.encode(name, 0, -1, operand);
  }

  reserveMachine(name: MachineOp) {
    this.instructionEncoder.encode(name, OpcodeSize.MACHINE_MASK, -1);
  }

  ///

  main() {
    this.encoder.push(Op.Main, $s0);
    this.invokePreparedComponent(false, false, true);
  }

  remoteElement(block: Block): void {
    this.encoder.push(Op.PushRemoteElement);
    block();
    this.encoder.push(Op.PopRemoteElement);
  }

  pushRootScope(symbols: number, bindCallerScope: boolean) {
    this.encoder.push(Op.RootScope, symbols, bindCallerScope ? 1 : 0);
  }

  pushChildScope() {
    this.encoder.push(Op.ChildScope);
  }

  popScope() {
    this.encoder.push(Op.PopScope);
  }

  prepareArgs(state: Register) {
    this.encoder.push(Op.PrepareArgs, state);
  }

  createComponent(state: Register, hasDefault: boolean) {
    let flag = (hasDefault as any) | 0;
    this.encoder.push(Op.CreateComponent, flag, state);
  }

  putComponentOperations() {
    this.encoder.push(Op.PutComponentOperations);
  }

  getComponentTagName(state: Register) {
    this.encoder.push(Op.GetComponentTagName, state);
  }

  getComponentLayout(state: Register) {
    this.encoder.push(Op.GetComponentLayout, state);
  }

  setupForEval(state: Register) {
    this.encoder.push(Op.SetupForEval, state);
  }

  invokeComponentLayout(state: Register) {
    this.encoder.push(Op.InvokeComponentLayout, state);
  }

  didCreateElement(state: Register) {
    this.encoder.push(Op.DidCreateElement, state);
  }

  didRenderLayout() {
    this.encoder.push(Op.DidRenderLayout, $s0);
  }

  frame(block: () => void): void {
    this.encoder.pushMachine(MachineOp.PushFrame);
    block();
    this.encoder.pushMachine(MachineOp.PopFrame);
  }

  toBoolean() {
    this.encoder.push(Op.ToBoolean);
  }

  invokePreparedComponent(
    hasBlock: boolean,
    bindableBlocks: boolean,
    bindableAtNames: boolean,
    populateLayout: Option<() => void> = null
  ) {
    this.encoder.push(Op.BeginComponentTransaction);
    this.encoder.push(Op.PushDynamicScope);

    this.createComponent($s0, hasBlock);

    // this has to run after createComponent to allow
    // for late-bound layouts, but a caller is free
    // to populate the layout earlier if it wants to
    // and do nothing here.
    if (populateLayout) populateLayout();

    this.encoder.push(Op.RegisterComponentDestructor, $s0);
    this.encoder.push(Op.GetComponentSelf, $s0);

    this.encoder.push(Op.VirtualRootScope, $s0);
    this.encoder.push(Op.SetVariable, 0);

    this.setupForEval($s0);
    if (bindableAtNames) this.setNamedVariables($s0);
    if (bindableBlocks) this.setBlocks($s0);
    this.pop();
    this.invokeComponentLayout($s0);
    this.didRenderLayout();
    this.encoder.pushMachine(MachineOp.PopFrame);

    this.popScope();
    this.encoder.push(Op.PopDynamicScope);
    this.encoder.push(Op.CommitComponentTransaction);
  }

  protected get pos(): number {
    return this.instructionEncoder.typePos;
  }

  protected get nextPos(): number {
    return this.instructionEncoder.size;
  }

  ///

  compileInline(sexp: WireFormat.Statements.Append): ['expr', Expression] | true {
    return this.compiler.compileInline(sexp, this);
  }

  compileBlock({ name, params, hash, blocks }: CompileBlock): void {
    this.compiler.compileBlock(name, params, hash, blocks, this);
  }

  label(name: string) {
    this.currentLabels.label(name, this.nextPos);
  }

  // helpers

  private get currentLabels(): Labels {
    return expect(this.labelsStack.current, 'bug: not in a label stack');
  }

  private startLabels() {
    this.labelsStack.push(new Labels());
  }

  private stopLabels() {
    let label = expect(this.labelsStack.pop(), 'unbalanced push and pop labels');
    label.patch(this.instructionEncoder);
  }

  // components

  pushCurriedComponent() {
    this.encoder.push(Op.PushCurriedComponent);
  }

  pushDynamicComponentInstance() {
    this.encoder.push(Op.PushDynamicComponentInstance);
  }

  // dom

  openDynamicElement() {
    this.encoder.push(Op.OpenDynamicElement);
  }

  flushElement() {
    this.encoder.push(Op.FlushElement);
  }

  closeElement() {
    this.encoder.push(Op.CloseElement);
  }

  // lists

  putIterator() {
    this.encoder.push(Op.PutIterator);
  }

  list(start: string, block: Block): void {
    this.enterList(start);
    block();
    this.encoder.push(Op.ExitList);
  }

  enterList(start: string) {
    this.reserve(Op.EnterList);
    this.currentLabels.target(this.pos, start);
  }

  iterate(breaks: string) {
    this.reserve(Op.Iterate);
    this.currentLabels.target(this.pos, breaks);
  }

  // expressions

  setNamedVariables(state: Register) {
    this.encoder.push(Op.SetNamedVariables, state);
  }

  setBlocks(state: Register) {
    this.encoder.push(Op.SetBlocks, state);
  }

  setBlock(symbol: number) {
    this.encoder.push(Op.SetBlock, symbol);
  }

  getVariable(symbol: number) {
    this.encoder.push(Op.GetVariable, symbol);
  }

  getBlock(symbol: number) {
    this.encoder.push(Op.GetBlock, symbol);
  }

  hasBlock(symbol: number) {
    this.encoder.push(Op.HasBlock, symbol);
  }

  concat(size: number) {
    this.encoder.push(Op.Concat, size);
  }

  withSavedRegister(register: SavedRegister, block: Block): void {
    this.encoder.push(Op.Fetch, register);
    block();
    this.encoder.push(Op.Load, register);
  }

  load(register: Register) {
    this.encoder.push(Op.Load, register);
  }

  fetch(register: Register) {
    this.encoder.push(Op.Fetch, register);
  }

  dup(register: MachineRegister = $sp, offset = 0) {
    return this.encoder.push(Op.Dup, register, offset);
  }

  pop(count = 1) {
    return this.encoder.push(Op.Pop, count);
  }

  // vm

  returnTo(label: string) {
    this.reserveMachine(MachineOp.ReturnTo);
    this.currentLabels.target(this.pos, label);
  }

  primitiveReference() {
    this.encoder.push(Op.PrimitiveReference);
  }

  reifyU32() {
    this.encoder.push(Op.ReifyU32);
  }

  enter(args: number) {
    this.encoder.push(Op.Enter, args);
  }

  exit() {
    this.encoder.push(Op.Exit);
  }

  return() {
    this.encoder.pushMachine(MachineOp.Return);
  }

  jump(target: string) {
    this.reserveMachine(MachineOp.Jump);
    this.currentLabels.target(this.pos, target);
  }

  jumpIf(target: string) {
    this.reserve(Op.JumpIf);
    this.currentLabels.target(this.pos, target);
  }

  jumpUnless(target: string) {
    this.reserve(Op.JumpUnless);
    this.currentLabels.target(this.pos, target);
  }

  jumpEq(value: number, target: string) {
    this.reserveWithOperand(Op.JumpEq, value);
    this.currentLabels.target(this.pos, target);
  }

  assertSame() {
    this.encoder.push(Op.AssertSame);
  }

  pushEmptyArgs() {
    this.encoder.push(Op.PushEmptyArgs);
  }

  labels(block: Block): void {
    this.startLabels();
    block();
    this.stopLabels();
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

    this.labels(() => {
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
    });

    this.exit();
  }

  stdAppend(trusting: boolean) {
    this.switch(this.contentType(), when => {
      when(ContentType.String, () => {
        if (trusting) {
          this.assertSame();
          this.encoder.push(Op.AppendHTML);
        } else {
          this.encoder.push(Op.AppendText);
        }
      });

      when(ContentType.Component, () => {
        this.pushCurriedComponent();
        this.pushDynamicComponentInstance();
        this.invokeBareComponent();
      });

      when(ContentType.SafeString, () => {
        this.assertSame();
        this.encoder.push(Op.AppendSafeHTML);
      });

      when(ContentType.Fragment, () => {
        this.assertSame();
        this.encoder.push(Op.AppendDocumentFragment);
      });

      when(ContentType.Node, () => {
        this.assertSame();
        this.encoder.push(Op.AppendNode);
      });
    });
  }

  populateLayout(state: number) {
    this.encoder.push(Op.PopulateLayout, state);
  }

  invokeBareComponent() {
    this.encoder.push(Op.Fetch, $s0);
    this.dup($sp, 1);
    this.encoder.push(Op.Load, $s0);

    this.encoder.pushMachine(MachineOp.PushFrame);
    this.pushEmptyArgs();
    this.prepareArgs($s0);

    this.invokePreparedComponent(false, false, true, () => {
      this.getComponentLayout($s0);
      this.populateLayout($s0);
    });

    this.load($s0);
  }

  isComponent() {
    this.encoder.push(Op.IsComponent);
  }

  contentType() {
    this.encoder.push(Op.ContentType);
  }

  pushBlockScope(): void {
    this.encoder.push(Op.PushBlockScope);
  }
}

export abstract class OpcodeBuilderImpl<Locator = Opaque> extends StdOpcodeBuilder
  implements OpcodeBuilder<Locator> {
  public stdLib: STDLib;
  public component: ComponentBuilderImpl<Locator> = new ComponentBuilderImpl(this);

  private expressionCompiler: Compilers<WireFormat.TupleExpression> = expressionCompiler();
  private isComponentAttrs = false;

  constructor(compiler: Compiler, public containingLayout: LayoutWithContext<Locator>) {
    super(compiler, containingLayout ? containingLayout.block.symbols.length : 0);
    this.stdLib = compiler.stdLib;
  }

  get asPartial(): boolean {
    return this.containingLayout.asPartial;
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

  /// ARBITRARY OPCODES

  push(name: Op, ...args: BuilderOperands): void {
    this.encoder.push(name, ...args);
  }

  ///

  popFrame(): void {
    this.encoder.pushMachine(MachineOp.PopFrame);
  }

  // args

  pushArgs(names: string[], flags: number): void {
    let serialized = this.constants.stringArray(names);
    this.encoder.push(Op.PushArgs, serialized, flags);
  }

  dynamicScope(names: Option<string[]>, block: Block): void {
    this.encoder.push(Op.PushDynamicScope);
    if (names && names.length) {
      this.encoder.push(Op.BindDynamicScope, this.names(names));
    }
    block();
    this.encoder.push(Op.PopDynamicScope);
  }

  pushYieldableBlock(block: Option<CompilableBlock>): void {
    this.pushSymbolTable(block && block.symbolTable);
    this.pushBlockScope();
    this.pushBlock(block);
  }

  curryComponent({ definition, params, hash, synthetic }: CurryComponent): void {
    let referrer = this.containingLayout.referrer;

    this.encoder.pushMachine(MachineOp.PushFrame);
    this.compileArgs(params, hash, EMPTY_BLOCKS, synthetic);
    this.encoder.push(Op.CaptureArgs);
    this.expr(definition);
    this.encoder.push(Op.CurryComponent, this.constants.serializable(referrer));
    this.encoder.pushMachine(MachineOp.PopFrame);
    this.encoder.push(Op.Fetch, $v0);
  }

  pushSymbolTable(table: Option<SymbolTable>): void {
    if (table) {
      let constant = this.constants.serializable(table);
      this.encoder.push(Op.PushSymbolTable, constant);
    } else {
      this.primitive(null);
    }
  }

  invokeComponent({
    capabilities,
    attrs,
    params,
    hash,
    synthetic,
    blocks: namedBlocks,
    layout,
  }: Component) {
    this.encoder.push(Op.Fetch, $s0);
    this.dup($sp, 1);
    this.encoder.push(Op.Load, $s0);

    this.encoder.pushMachine(MachineOp.PushFrame);

    let bindableBlocks = !!namedBlocks;
    let bindableAtNames =
      capabilities === true || capabilities.prepareArgs || !!(hash && hash[0].length !== 0);

    let blocks = namedBlocks.with('attrs', attrs);

    this.compileArgs(params, hash, blocks, synthetic);
    this.prepareArgs($s0);

    this.invokePreparedComponent(blocks.has('default'), bindableBlocks, bindableAtNames, () => {
      if (layout) {
        this.pushSymbolTable(layout.symbolTable);
        this.pushLayout(layout);
        this.resolveLayout();
      } else {
        this.getComponentLayout($s0);
      }

      this.populateLayout($s0);
    });

    this.load($s0);
  }

  invokeStaticComponent({
    capabilities,
    layout,
    attrs,
    params,
    hash,
    synthetic,
    blocks,
  }: StaticComponent) {
    let { symbolTable } = layout;

    let bailOut = symbolTable.hasEval || capabilities.prepareArgs;

    if (bailOut) {
      this.invokeComponent({ capabilities, attrs, params, hash, synthetic, blocks, layout });
      return;
    }

    this.encoder.push(Op.Fetch, $s0);
    this.dup($sp, 1);
    this.encoder.push(Op.Load, $s0);

    let { symbols } = symbolTable;

    if (capabilities.createArgs) {
      this.encoder.pushMachine(MachineOp.PushFrame);
      this.compileArgs(null, hash, EMPTY_BLOCKS, synthetic);
    }

    this.encoder.push(Op.BeginComponentTransaction);

    if (capabilities.dynamicScope) {
      this.encoder.push(Op.PushDynamicScope);
    }

    if (capabilities.createInstance) {
      this.createComponent($s0, blocks.has('default'));
    }

    if (capabilities.createArgs) {
      this.encoder.pushMachine(MachineOp.PopFrame);
    }

    this.encoder.pushMachine(MachineOp.PushFrame);
    this.encoder.push(Op.RegisterComponentDestructor, $s0);

    let bindings: { symbol: number; isBlock: boolean }[] = [];

    this.encoder.push(Op.GetComponentSelf, $s0);
    bindings.push({ symbol: 0, isBlock: false });

    for (let i = 0; i < symbols.length; i++) {
      let symbol = symbols[i];

      switch (symbol.charAt(0)) {
        case '&':
          let callerBlock;

          if (symbol === ATTRS_BLOCK) {
            callerBlock = attrs;
          } else {
            callerBlock = blocks.get(symbol.slice(1));
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

    this.pushRootScope(symbols.length + 1, Object.keys(blocks).length > 0);

    for (let i = bindings.length - 1; i >= 0; i--) {
      let { symbol, isBlock } = bindings[i];

      if (isBlock) {
        this.setBlock(symbol);
      } else {
        this.encoder.push(Op.SetVariable, symbol);
      }
    }

    this.invokeStatic(layout);

    if (capabilities.createInstance) {
      this.didRenderLayout();
    }

    this.encoder.pushMachine(MachineOp.PopFrame);

    this.popScope();

    if (capabilities.dynamicScope) {
      this.encoder.push(Op.PopDynamicScope);
    }

    this.encoder.push(Op.CommitComponentTransaction);

    this.load($s0);
  }

  invokeDynamicComponent({ definition, attrs, params, hash, synthetic, blocks }: DynamicComponent) {
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

        this.invokeComponent({ capabilities: true, attrs, params, hash, synthetic, blocks });

        this.label('ELSE');
      },
    });
  }

  yield(to: number, params: Option<WireFormat.Core.Params>) {
    this.compileArgs(params, null, EMPTY_BLOCKS, false);
    this.getBlock(to);
    this.resolveBlock();
    this.encoder.push(Op.InvokeYield);
    this.popScope();
    this.encoder.pushMachine(MachineOp.PopFrame);
  }

  guardedAppend(expression: WireFormat.Expression, trusting: boolean): void {
    this.encoder.pushMachine(MachineOp.PushFrame);

    this.expr(expression);

    this.encoder.pushMachine(MachineOp.InvokeStatic, this.stdLib.getAppend(trusting));

    this.encoder.pushMachine(MachineOp.PopFrame);
  }

  invokeStaticBlock(block: CompilableBlock, callerCount = 0): void {
    let { parameters } = block.symbolTable;
    let calleeCount = parameters.length;
    let count = Math.min(callerCount, calleeCount);

    this.encoder.pushMachine(MachineOp.PushFrame);

    if (count) {
      this.pushChildScope();

      for (let i = 0; i < count; i++) {
        this.dup($fp, callerCount - i);
        this.encoder.push(Op.SetVariable, parameters[i]);
      }
    }

    this.pushBlock(block);
    this.resolveBlock();
    this.encoder.pushMachine(MachineOp.InvokeVirtual);

    if (count) {
      this.popScope();
    }

    this.encoder.pushMachine(MachineOp.PopFrame);
  }

  /// CONVENIENCE

  wrappedComponent(layout: LayoutWithContext<Locator>, attrsBlockNumber: number) {
    let b = this;

    b.labels(() => {
      b.withSavedRegister($s1, () => {
        b.getComponentTagName($s0);
        b.primitiveReference();

        b.dup();
      });

      b.jumpUnless('BODY');

      b.fetch($s1);
      b.setComponentAttrs(true);
      b.putComponentOperations();
      b.openDynamicElement();
      b.didCreateElement($s0);
      b.yield(attrsBlockNumber, []);
      b.setComponentAttrs(false);
      b.flushElement();

      b.label('BODY');

      b.invokeStaticBlock(blockFor(layout, this.compiler));

      b.fetch($s1);
      b.jumpUnless('END');
      b.closeElement();

      b.label('END');
      b.load($s1);
    });

    let handle = b.commit();

    if (DEBUG) {
      debugCompiler(this.compiler as Recast<any, AnyAbstractCompiler>, handle);
    }

    return handle;
  }

  staticComponent(handle: number, args: ComponentArgs): void {
    let [params, hash, blocks] = args;

    if (handle !== null) {
      let { capabilities, compilable } = this.compiler.resolveLayoutForHandle(handle);

      if (compilable) {
        this.pushComponentDefinition(handle);
        this.invokeStaticComponent({
          capabilities,
          layout: compilable,
          attrs: null,
          params,
          hash,
          synthetic: false,
          blocks,
        });
      } else {
        this.pushComponentDefinition(handle);
        this.invokeComponent({
          capabilities,
          attrs: null,
          params,
          hash,
          synthetic: false,
          blocks,
        });
      }
    }
  }

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
    this.encoder.push(Op.Primitive, immediate);
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
    this.encoder.push(Op.PushComponentDefinition, this.constants.handle(handle));
  }

  resolveDynamicComponent(referrer: Locator) {
    this.encoder.push(Op.ResolveDynamicComponent, this.constants.serializable(referrer));
  }

  staticComponentHelper(
    tag: string,
    hash: WireFormat.Core.Hash,
    template: Option<CompilableBlock>
  ): boolean {
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
        this.invokeStaticComponent({
          capabilities,
          layout: compilable,
          attrs: null,
          params: null,
          hash,
          synthetic: false,
          blocks: NamedBlocksImpl.from('default', template),
        });

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

    this.encoder.push(Op.InvokePartial, _meta, _symbols, _evalInfo);
  }

  resolveMaybeLocal(name: string) {
    this.encoder.push(Op.ResolveMaybeLocal, this.string(name));
  }

  // debugger

  debugger(symbols: string[], evalInfo: number[]) {
    this.encoder.push(
      Op.Debugger,
      this.constants.stringArray(symbols),
      this.constants.array(evalInfo)
    );
  }

  // dom

  text(text: string) {
    this.encoder.push(Op.Text, this.constants.string(text));
  }

  openPrimitiveElement(tag: string) {
    this.encoder.push(Op.OpenElement, this.constants.string(tag));
  }

  modifier({ handle, params, hash }: CompileHelper) {
    this.encoder.pushMachine(MachineOp.PushFrame);
    this.compileArgs(params, hash, EMPTY_BLOCKS, true);
    this.encoder.push(Op.Modifier, this.constants.handle(handle));
    this.encoder.pushMachine(MachineOp.PopFrame);
  }

  comment(_comment: string) {
    let comment = this.constants.string(_comment);
    this.encoder.push(Op.Comment, comment);
  }

  dynamicAttr(_name: string, _namespace: Option<string>, trusting: boolean) {
    let name = this.constants.string(_name);
    let namespace = _namespace ? this.constants.string(_namespace) : 0;

    if (this.isComponentAttrs) {
      this.encoder.push(Op.ComponentAttr, name, trusting === true ? 1 : 0, namespace);
    } else {
      this.encoder.push(Op.DynamicAttr, name, trusting === true ? 1 : 0, namespace);
    }
  }

  staticAttr(_name: string, _namespace: Option<string>, _value: string): void {
    let name = this.constants.string(_name);
    let namespace = _namespace ? this.constants.string(_namespace) : 0;

    if (this.isComponentAttrs) {
      this.pushPrimitiveReference(_value);
      this.encoder.push(Op.ComponentAttr, name, 1, namespace);
    } else {
      let value = this.constants.string(_value);
      this.encoder.push(Op.StaticAttr, name, value, namespace);
    }
  }

  // expressions

  hasBlockParams(to: number) {
    this.getBlock(to);
    this.resolveBlock();
    this.encoder.push(Op.HasBlockParams);
  }

  getProperty(key: string) {
    this.encoder.push(Op.GetProperty, this.string(key));
  }

  helper({ handle, params, hash }: CompileHelper) {
    this.encoder.pushMachine(MachineOp.PushFrame);
    this.compileArgs(params, hash, EMPTY_BLOCKS, true);
    this.encoder.push(Op.Helper, this.constants.handle(handle));
    this.encoder.pushMachine(MachineOp.PopFrame);
    this.encoder.push(Op.Fetch, $v0);
  }

  bindDynamicScope(_names: string[]) {
    this.encoder.push(Op.BindDynamicScope, this.names(_names));
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
    this.labels(() => {
      this.encoder.pushMachine(MachineOp.PushFrame);

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
      this.encoder.pushMachine(MachineOp.PopFrame);
    });
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

  get evalSymbols(): Option<string[]> {
    let {
      containingLayout: { block },
    } = this;

    return block.hasEval ? block.symbols : null;
  }

  params(params: Option<WireFormat.Core.Params>) {
    if (!params) return 0;

    for (let i = 0; i < params.length; i++) {
      this.expr(params[i]);
    }

    return params.length;
  }

  compileArgs(
    params: Option<WireFormat.Core.Params>,
    hash: Option<WireFormat.Core.Hash>,
    blocks: NamedBlocks,
    synthetic: boolean
  ): void {
    if (blocks.hasAny) {
      this.pushYieldableBlock(blocks.get('default'));
      this.pushYieldableBlock(blocks.get('else'));
      this.pushYieldableBlock(blocks.get('attrs'));
    }

    let count = this.params(params);

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

  template(block: WireFormat.SerializedInlineBlock): CompilableBlock;
  template(block: Option<WireFormat.SerializedInlineBlock>): Option<CompilableBlock>;
  template(block: Option<WireFormat.SerializedInlineBlock>): Option<CompilableBlock> {
    if (!block) return null;

    return this.inlineBlock(block);
  }

  templates(blocks: WireFormat.Core.Blocks): NamedBlocks {
    return NamedBlocksImpl.fromWireFormat(blocks, block => this.template(block));
  }
}

export default OpcodeBuilderImpl;

export class LazyOpcodeBuilder<Locator> extends OpcodeBuilderImpl<Locator> {
  public constants!: CompileTimeLazyConstants; // Hides property on base class

  pushBlock(block: Option<CompilableBlock>): void {
    if (block) {
      this.pushOther(block);
    } else {
      this.primitive(null);
    }
  }

  resolveBlock(): void {
    this.encoder.push(Op.CompileBlock);
  }

  pushLayout(layout: Option<CompilableProgram>) {
    if (layout) {
      this.pushOther(layout);
    } else {
      this.primitive(null);
    }
  }

  resolveLayout(): void {
    this.encoder.push(Op.CompileBlock);
  }

  invokeStatic(compilable: CompilableTemplate): void {
    this.pushOther(compilable);
    this.encoder.push(Op.CompileBlock);
    this.encoder.pushMachine(MachineOp.InvokeVirtual);
  }

  protected pushOther<T>(value: T) {
    this.encoder.push(Op.Constant, this.other(value));
  }

  protected other(value: Opaque): number {
    return this.constants.other(value);
  }
}

export class EagerOpcodeBuilder<Locator> extends OpcodeBuilderImpl<Locator> {
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
      this.encoder.pushMachine(
        MachineOp.InvokeStatic,
        () => compilable.compile() as Recast<VMHandle, number>
      );
    } else {
      this.encoder.pushMachine(MachineOp.InvokeStatic, handle as Recast<VMHandle, number>);
    }
  }
}

function blockFor<Locator>(
  layout: LayoutWithContext,
  compiler: Compiler<OpcodeBuilder<Locator>>
): CompilableBlock {
  return new CompilableBlockInstance(compiler, {
    block: {
      statements: layout.block.statements,
      parameters: EMPTY_ARRAY,
    },
    containingLayout: layout,
  });
}
