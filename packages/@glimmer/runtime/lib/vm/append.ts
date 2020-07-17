import {
  CompilableBlock,
  CompilableTemplate,
  Destroyable,
  DynamicScope,
  Environment,
  JitOrAotBlock,
  PartialScope,
  RenderResult,
  RichIteratorResult,
  RuntimeContext,
  RuntimeConstants,
  RuntimeHeap,
  RuntimeProgram,
  Scope,
  SyntaxCompilationContext,
  VM as PublicVM,
  JitRuntimeContext,
  AotRuntimeContext,
  ElementBuilder,
} from '@glimmer/interfaces';
import { LOCAL_SHOULD_LOG } from '@glimmer/local-debug-flags';
import { RuntimeOpImpl } from '@glimmer/program';
import {
  PathReference,
  VersionedPathReference,
  IterableReference,
  OpaqueIterationItem,
} from '@glimmer/reference';
import { expect, Option, Stack, assert } from '@glimmer/util';
import {
  $fp,
  $pc,
  $s0,
  $s1,
  $sp,
  $t0,
  $t1,
  $v0,
  isLowLevelRegister,
  MachineRegister,
  Register,
  SyscallRegister,
} from '@glimmer/vm';
import { CheckNumber, check } from '@glimmer/debug';
import { unwrapHandle } from '@glimmer/util';
import { combineFromIndex } from '../utils/tags';
import { DidModifyOpcode, JumpIfNotModifiedOpcode } from '../compiled/opcodes/vm';
import { ScopeImpl } from '../environment';
import { APPEND_OPCODES, DebugState, UpdatingOpcode } from '../opcodes';
import { UNDEFINED_REFERENCE } from '../references';
import { ARGS, CONSTANTS, DESTROYABLE_STACK, HEAP, INNER_VM, REGISTERS, STACKS } from '../symbols';
import { VMArgumentsImpl } from './arguments';
import LowLevelVM from './low-level';
import RenderResultImpl from './render-result';
import EvaluationStackImpl, { EvaluationStack } from './stack';
import {
  BlockOpcode,
  ListBlockOpcode,
  ResumableVMState,
  ResumableVMStateImpl,
  TryOpcode,
  VMState,
  ListItemOpcode,
} from './update';
import { associateDestroyableChild } from '../destroyables';
import { LiveBlockList } from './element-builder';

/**
 * This interface is used by internal opcodes, and is more stable than
 * the implementation of the Append VM itself.
 */
export interface InternalVM<C extends JitOrAotBlock = JitOrAotBlock> {
  readonly [CONSTANTS]: RuntimeConstants;
  readonly [ARGS]: VMArgumentsImpl;

  readonly env: Environment;
  readonly stack: EvaluationStack;
  readonly runtime: RuntimeContext;

  loadValue(register: MachineRegister, value: number): void;
  loadValue(register: Register, value: unknown): void;
  loadValue(register: Register | MachineRegister, value: unknown): void;

  fetchValue(register: MachineRegister.ra | MachineRegister.pc): number;
  // TODO: Something better than a type assertion?
  fetchValue<T>(register: Register): T;
  fetchValue(register: Register): unknown;

  load(register: Register): void;
  fetch(register: Register): void;

  scope(): Scope<C>;
  elements(): ElementBuilder;

  getSelf(): PathReference<unknown>;

  updateWith(opcode: UpdatingOpcode): void;

  associateDestroyable(d: Destroyable): void;

  beginCacheGroup(): void;
  commitCacheGroup(): void;

  /// Iteration ///

  enterList(offset: number): void;
  exitList(): void;
  enterItem(iterableRef: IterableReference, item: OpaqueIterationItem): ListItemOpcode;
  registerItem(opcode: ListItemOpcode): void;

  pushRootScope(size: number): PartialScope<C>;
  pushChildScope(): void;
  popScope(): void;
  pushScope(scope: Scope<C>): void;

  dynamicScope(): DynamicScope;
  bindDynamicScope(names: number[]): void;
  pushDynamicScope(): void;
  popDynamicScope(): void;

  enter(args: number): void;
  exit(): void;

  goto(pc: number): void;
  call(handle: number): void;
  pushFrame(): void;

  referenceForSymbol(symbol: number): PathReference<unknown>;

  execute(initialize?: (vm: this) => void): RenderResult;
  pushUpdating(list?: UpdatingOpcode[]): void;
  next(): RichIteratorResult<null, RenderResult>;
}

export interface InternalJitVM extends InternalVM<CompilableBlock> {
  compile(block: CompilableTemplate): number;
  readonly runtime: JitRuntimeContext;
  readonly context: SyntaxCompilationContext;
}

class Stacks<C extends JitOrAotBlock> {
  readonly scope = new Stack<Scope<C>>();
  readonly dynamicScope = new Stack<DynamicScope>();
  readonly updating = new Stack<UpdatingOpcode[]>();
  readonly cache = new Stack<JumpIfNotModifiedOpcode>();
  readonly list = new Stack<ListBlockOpcode>();
}

export default abstract class VM<C extends JitOrAotBlock> implements PublicVM, InternalVM<C> {
  private readonly [STACKS] = new Stacks<C>();
  private readonly [HEAP]: RuntimeHeap;
  private readonly destructor: object;
  private readonly [DESTROYABLE_STACK] = new Stack<object>();
  readonly [CONSTANTS]: RuntimeConstants;
  readonly [ARGS]: VMArgumentsImpl;
  readonly [INNER_VM]: LowLevelVM;

  get stack(): EvaluationStack {
    return this[INNER_VM].stack as EvaluationStack;
  }

  /* Registers */

  get pc(): number {
    return this[INNER_VM].fetchRegister($pc);
  }

  public s0: unknown = null;
  public s1: unknown = null;
  public t0: unknown = null;
  public t1: unknown = null;
  public v0: unknown = null;

  // Fetch a value from a register onto the stack
  fetch(register: SyscallRegister): void {
    this.stack.push(this.fetchValue(register));
  }

  // Load a value from the stack into a register
  load(register: SyscallRegister) {
    let value = this.stack.pop();

    this.loadValue(register, value);
  }

  // Fetch a value from a register
  fetchValue(register: MachineRegister): number;
  fetchValue<T>(register: Register): T;
  fetchValue(register: Register | MachineRegister): unknown {
    if (isLowLevelRegister(register)) {
      return this[INNER_VM].fetchRegister(register);
    }

    switch (register) {
      case $s0:
        return this.s0;
      case $s1:
        return this.s1;
      case $t0:
        return this.t0;
      case $t1:
        return this.t1;
      case $v0:
        return this.v0;
    }
  }

  // Load a value into a register

  loadValue<T>(register: Register | MachineRegister, value: T): void {
    if (isLowLevelRegister(register)) {
      this[INNER_VM].loadRegister(register, (value as any) as number);
    }

    switch (register) {
      case $s0:
        this.s0 = value;
        break;
      case $s1:
        this.s1 = value;
        break;
      case $t0:
        this.t0 = value;
        break;
      case $t1:
        this.t1 = value;
        break;
      case $v0:
        this.v0 = value;
        break;
    }
  }

  /**
   * Migrated to Inner
   */

  // Start a new frame and save $ra and $fp on the stack
  pushFrame() {
    this[INNER_VM].pushFrame();
  }

  // Restore $ra, $sp and $fp
  popFrame() {
    this[INNER_VM].popFrame();
  }

  // Jump to an address in `program`
  goto(offset: number) {
    this[INNER_VM].goto(offset);
  }

  // Save $pc into $ra, then jump to a new address in `program` (jal in MIPS)
  call(handle: number) {
    this[INNER_VM].call(handle);
  }

  // Put a specific `program` address in $ra
  returnTo(offset: number) {
    this[INNER_VM].returnTo(offset);
  }

  // Return to the `program` address stored in $ra
  return() {
    this[INNER_VM].return();
  }

  /**
   * End of migrated.
   */

  constructor(
    readonly runtime: RuntimeContext,
    { pc, scope, dynamicScope, stack }: VMState,
    private readonly elementStack: ElementBuilder
  ) {
    let evalStack = EvaluationStackImpl.restore(stack);

    assert(typeof pc === 'number', 'pc is a number');

    evalStack[REGISTERS][$pc] = pc;
    evalStack[REGISTERS][$sp] = stack.length - 1;
    evalStack[REGISTERS][$fp] = -1;

    this[HEAP] = this.program.heap;
    this[CONSTANTS] = this.program.constants;
    this.elementStack = elementStack;
    this[STACKS].scope.push(scope);
    this[STACKS].dynamicScope.push(dynamicScope);
    this[ARGS] = new VMArgumentsImpl();
    this[INNER_VM] = new LowLevelVM(
      evalStack,
      this[HEAP],
      runtime.program,
      {
        debugBefore: (opcode: RuntimeOpImpl): DebugState => {
          return APPEND_OPCODES.debugBefore(this, opcode);
        },

        debugAfter: (state: DebugState): void => {
          APPEND_OPCODES.debugAfter(this, state);
        },
      },
      evalStack[REGISTERS]
    );

    this.destructor = {};
    this[DESTROYABLE_STACK].push(this.destructor);
  }

  get program(): RuntimeProgram {
    return this.runtime.program;
  }

  get env(): Environment {
    return this.runtime.env;
  }

  captureState(args: number, pc = this[INNER_VM].fetchRegister($pc)): VMState {
    return {
      pc,
      dynamicScope: this.dynamicScope(),
      scope: this.scope(),
      stack: this.stack.capture(args),
    };
  }

  abstract capture(args: number, pc?: number): ResumableVMState<InternalVM>;

  beginCacheGroup() {
    let opcodes = this.updating();
    let guard = new JumpIfNotModifiedOpcode(opcodes.length);

    opcodes.push(guard);
    this[STACKS].cache.push(guard);
  }

  commitCacheGroup() {
    let opcodes = this.updating();
    let guard = expect(this[STACKS].cache.pop(), 'VM BUG: Expected a cache group');

    let startIndex = guard.index;

    let tag = combineFromIndex(opcodes, startIndex);
    opcodes.push(new DidModifyOpcode(guard));

    guard.finalize(tag, opcodes.length);
  }

  enter(args: number) {
    let updating: UpdatingOpcode[] = [];

    let state = this.capture(args);
    let block = this.elements().pushUpdatableBlock();

    let tryOpcode = new TryOpcode(state, this.runtime, block, updating);

    this.didEnter(tryOpcode);
  }

  enterItem(
    iterableRef: IterableReference,
    { key, value, memo }: OpaqueIterationItem
  ): ListItemOpcode {
    let { stack } = this;

    let valueRef = iterableRef.childRefFor(key, value);
    let memoRef = iterableRef.childRefFor(key, memo);

    stack.push(valueRef);
    stack.push(memoRef);

    let state = this.capture(2);
    let block = this.elements().pushUpdatableBlock();

    let opcode = new ListItemOpcode(state, this.runtime, block, key, memoRef, valueRef);
    this.didEnter(opcode);

    return opcode;
  }

  registerItem(opcode: ListItemOpcode) {
    this.listBlock().initializeChild(opcode);
  }

  enterList(offset: number) {
    let updating: ListItemOpcode[] = [];

    let addr = this[INNER_VM].target(offset);
    let state = this.capture(0, addr);
    let list = this.elements().pushBlockList(updating) as LiveBlockList;
    let iterableRef = this.stack.peek<IterableReference>();

    let opcode = new ListBlockOpcode(state, this.runtime, list, updating, iterableRef);

    this[STACKS].list.push(opcode);

    this.didEnter(opcode);
  }

  private didEnter(opcode: BlockOpcode) {
    this.associateDestroyable(opcode);
    this[DESTROYABLE_STACK].push(opcode);
    this.updateWith(opcode);
    this.pushUpdating(opcode.children);
  }

  exit() {
    this[DESTROYABLE_STACK].pop();
    this.elements().popBlock();
    this.popUpdating();

    let updating = this.updating();

    let parent = updating[updating.length - 1] as BlockOpcode;

    parent.didInitializeChildren();
  }

  exitList() {
    this.exit();
    this[STACKS].list.pop();
  }

  pushUpdating(list: UpdatingOpcode[] = []): void {
    this[STACKS].updating.push(list);
  }

  popUpdating(): UpdatingOpcode[] {
    return expect(this[STACKS].updating.pop(), "can't pop an empty stack");
  }

  updateWith(opcode: UpdatingOpcode) {
    this.updating().push(opcode);
  }

  listBlock(): ListBlockOpcode {
    return expect(this[STACKS].list.current, 'expected a list block');
  }

  associateDestroyable(child: Destroyable): void {
    let parent = expect(this[DESTROYABLE_STACK].current, 'Expected destructor parent');
    associateDestroyableChild(parent, child);
  }

  tryUpdating(): Option<UpdatingOpcode[]> {
    return this[STACKS].updating.current;
  }

  updating(): UpdatingOpcode[] {
    return expect(
      this[STACKS].updating.current,
      'expected updating opcode on the updating opcode stack'
    );
  }

  elements(): ElementBuilder {
    return this.elementStack;
  }

  scope(): Scope<C> {
    return expect(this[STACKS].scope.current, 'expected scope on the scope stack');
  }

  dynamicScope(): DynamicScope {
    return expect(
      this[STACKS].dynamicScope.current,
      'expected dynamic scope on the dynamic scope stack'
    );
  }

  pushChildScope() {
    this[STACKS].scope.push(this.scope().child());
  }

  pushDynamicScope(): DynamicScope {
    let child = this.dynamicScope().child();
    this[STACKS].dynamicScope.push(child);
    return child;
  }

  pushRootScope(size: number): PartialScope<C> {
    let scope = ScopeImpl.sized<C>(size);
    this[STACKS].scope.push(scope);
    return scope;
  }

  pushScope(scope: Scope<C>) {
    this[STACKS].scope.push(scope);
  }

  popScope() {
    this[STACKS].scope.pop();
  }

  popDynamicScope() {
    this[STACKS].dynamicScope.pop();
  }

  /// SCOPE HELPERS

  getSelf(): PathReference<any> {
    return this.scope().getSelf();
  }

  referenceForSymbol(symbol: number): PathReference<unknown> {
    return this.scope().getSymbol(symbol);
  }

  /// EXECUTION

  execute(initialize?: (vm: this) => void): RenderResult {
    if (LOCAL_SHOULD_LOG) {
      console.log(`EXECUTING FROM ${this[INNER_VM].fetchRegister($pc)}`);
    }

    if (initialize) initialize(this);

    let result: RichIteratorResult<null, RenderResult>;

    try {
      while (true) {
        result = this.next();
        if (result.done) break;
      }
    } finally {
      // If any existing blocks are open, due to an error or something like
      // that, we need to close them all and clean things up properly.
      let elements = this.elements();

      while (elements.hasBlocks) {
        elements.popBlock();
      }
    }

    return result.value;
  }

  next(): RichIteratorResult<null, RenderResult> {
    let { env, elementStack } = this;
    let opcode = this[INNER_VM].nextStatement();
    let result: RichIteratorResult<null, RenderResult>;
    if (opcode !== null) {
      this[INNER_VM].evaluateOuter(opcode, this);
      result = { done: false, value: null };
    } else {
      // Unload the stack
      this.stack.reset();

      result = {
        done: true,
        value: new RenderResultImpl(
          env,
          this.popUpdating(),
          elementStack.popBlock(),
          this.destructor
        ),
      };
    }
    return result;
  }

  bindDynamicScope(names: number[]) {
    let scope = this.dynamicScope();

    for (let i = names.length - 1; i >= 0; i--) {
      let name = this[CONSTANTS].getString(names[i]);
      scope.set(name, this.stack.pop<VersionedPathReference<unknown>>());
    }
  }
}

function vmState<C extends JitOrAotBlock>(
  pc: number,
  scope: Scope<C> = ScopeImpl.root<C>(UNDEFINED_REFERENCE, 0),
  dynamicScope: DynamicScope
) {
  return {
    pc,
    scope,
    dynamicScope,
    stack: [],
  };
}

export interface MinimalInitOptions {
  handle: number;
  treeBuilder: ElementBuilder;
  dynamicScope: DynamicScope;
}

export interface InitOptions extends MinimalInitOptions {
  self: PathReference<unknown>;
}

export class AotVM extends VM<number> implements InternalVM<number> {
  static empty(
    runtime: AotRuntimeContext,
    { handle, treeBuilder, dynamicScope }: MinimalInitOptions
  ): InternalVM<number> {
    let vm = initAOT(
      runtime,
      vmState(
        runtime.program.heap.getaddr(handle),
        ScopeImpl.root<number>(UNDEFINED_REFERENCE, 0),
        dynamicScope
      ),
      treeBuilder
    );
    vm.pushUpdating();
    return vm;
  }

  static initial(
    runtime: AotRuntimeContext,
    { handle, self, treeBuilder, dynamicScope }: InitOptions
  ) {
    let scopeSize = runtime.program.heap.scopesizeof(handle);
    let scope = ScopeImpl.root(self, scopeSize);
    let pc = check(runtime.program.heap.getaddr(handle), CheckNumber);
    let state = vmState(pc, scope, dynamicScope);
    let vm = initAOT(runtime, state, treeBuilder);
    vm.pushUpdating();
    return vm;
  }

  capture(args: number, pc = this[INNER_VM].fetchRegister($pc)): ResumableVMState<AotVM> {
    return new ResumableVMStateImpl(this.captureState(args, pc), initAOT);
  }
}

export type VmInitCallback<V extends InternalVM = InternalVM> = (
  this: void,
  runtime: V extends JitVM ? JitRuntimeContext : AotRuntimeContext,
  state: VMState,
  builder: ElementBuilder
) => V;

export type JitVmInitCallback<V extends InternalVM> = (
  this: void,
  runtime: JitRuntimeContext,
  state: VMState,
  builder: ElementBuilder
) => V;

function initAOT(runtime: AotRuntimeContext, state: VMState, builder: ElementBuilder): AotVM {
  return new AotVM(runtime, state, builder);
}

function initJIT(context: SyntaxCompilationContext): JitVmInitCallback<JitVM> {
  return (runtime, state, builder) => new JitVM(runtime, state, builder, context);
}

export class JitVM extends VM<CompilableBlock> implements InternalJitVM {
  static initial(
    runtime: JitRuntimeContext,
    context: SyntaxCompilationContext,
    { handle, self, dynamicScope, treeBuilder }: InitOptions
  ) {
    let scopeSize = runtime.program.heap.scopesizeof(handle);
    let scope = ScopeImpl.root(self, scopeSize);
    let state = vmState(runtime.program.heap.getaddr(handle), scope, dynamicScope);
    let vm = initJIT(context)(runtime, state, treeBuilder);
    vm.pushUpdating();
    return vm;
  }

  static empty(
    runtime: JitRuntimeContext,
    { handle, treeBuilder, dynamicScope }: MinimalInitOptions,
    context: SyntaxCompilationContext
  ) {
    let vm = initJIT(context)(
      runtime,
      vmState(
        runtime.program.heap.getaddr(handle),
        ScopeImpl.root<CompilableBlock>(UNDEFINED_REFERENCE, 0),
        dynamicScope
      ),
      treeBuilder
    );
    vm.pushUpdating();
    return vm;
  }

  readonly runtime!: JitRuntimeContext;

  constructor(
    runtime: JitRuntimeContext,
    state: VMState,
    elementStack: ElementBuilder,
    readonly context: SyntaxCompilationContext
  ) {
    super(runtime, state, elementStack);
  }

  capture(args: number, pc = this[INNER_VM].fetchRegister($pc)): ResumableVMState<JitVM> {
    return new ResumableVMStateImpl(this.captureState(args, pc), this.resume);
  }

  private resume: VmInitCallback<JitVM> = initJIT(this.context);

  compile(block: CompilableTemplate): number {
    let handle = unwrapHandle(block.compile(this.context));

    return handle;
  }
}
