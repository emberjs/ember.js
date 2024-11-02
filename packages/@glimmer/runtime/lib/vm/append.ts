import type {
  CompilableTemplate,
  CompileTimeCompilationContext,
  Destroyable,
  DynamicScope,
  ElementBuilder,
  Environment,
  JitConstants,
  Nullable,
  Owner,
  PartialScope,
  RenderResult,
  RichIteratorResult,
  RuntimeContext,
  RuntimeHeap,
  RuntimeProgram,
  Scope,
  UpdatingOpcode,
  VM as PublicVM,
} from '@glimmer/interfaces';
import type { RuntimeOpImpl } from '@glimmer/program';
import type { OpaqueIterationItem, OpaqueIterator, Reference } from '@glimmer/reference';
import type {
  $ra,
  $s0,
  $s1,
  $t0,
  $t1,
  $v0,
  MachineRegister,
  Register,
  SyscallRegister,
} from '@glimmer/vm';
import { assert, expect, unwrapHandle } from '@glimmer/debug-util';
import { associateDestroyableChild } from '@glimmer/destroyable';
import { assertGlobalContextWasSet } from '@glimmer/global-context';
import { LOCAL_DEBUG, LOCAL_SHOULD_LOG } from '@glimmer/local-debug-flags';
import { createIteratorItemRef, UNDEFINED_REFERENCE } from '@glimmer/reference';
import { LOCAL_LOGGER, reverse, Stack } from '@glimmer/util';
import { beginTrackFrame, endTrackFrame, resetTracking } from '@glimmer/validator';
import { $fp, $pc, $sp, isLowLevelRegister } from '@glimmer/vm';

import type { DebugState } from '../opcodes';
import type { LiveBlockList } from './element-builder';
import type { EvaluationStack } from './stack';
import type { BlockOpcode, ResumableVMState, VMState } from './update';

import {
  BeginTrackFrameOpcode,
  EndTrackFrameOpcode,
  JumpIfNotModifiedOpcode,
} from '../compiled/opcodes/vm';
import { APPEND_OPCODES } from '../opcodes';
import { PartialScopeImpl } from '../scope';
import { REGISTERS } from '../symbols';
import { VMArgumentsImpl } from './arguments';
import { LowLevelVM } from './low-level';
import RenderResultImpl from './render-result';
import EvaluationStackImpl from './stack';
import { ListBlockOpcode, ListItemOpcode, ResumableVMStateImpl, TryOpcode } from './update';

class Stacks {
  readonly scope = new Stack<Scope>();
  readonly dynamicScope = new Stack<DynamicScope>();
  readonly updating = new Stack<UpdatingOpcode[]>();
  readonly cache = new Stack<JumpIfNotModifiedOpcode>();
  readonly list = new Stack<ListBlockOpcode>();
}

interface SyscallRegisters {
  [$pc]: null;
  [$ra]: null;
  [$fp]: null;
  [$sp]: null;
  [$s0]: unknown;
  [$s1]: unknown;
  [$t0]: unknown;
  [$t1]: unknown;
  [$v0]: unknown;
}

interface DebugVmState {
  readonly stacks: Stacks;
  readonly destroyableStack: Stack<object>;
  readonly constants: JitConstants;
  readonly lowlevel: LowLevelVM;
  readonly registers: SyscallRegisters;
}

export class VM implements PublicVM {
  readonly #stacks = new Stacks();
  readonly #heap: RuntimeHeap;
  readonly #destructor: object;
  readonly #destroyableStack = new Stack<object>();
  readonly constants: JitConstants;
  readonly args: VMArgumentsImpl;
  readonly lowlevel: LowLevelVM;
  readonly debug?: DebugVmState;

  get stack(): EvaluationStack {
    return this.lowlevel.stack as EvaluationStack;
  }

  /* Registers */

  get pc(): number {
    return this.lowlevel.fetchRegister($pc);
  }

  #registers: SyscallRegisters = [null, null, null, null, null, null, null, null, null];

  // Fetch a value from a register onto the stack
  fetch(register: SyscallRegister): void {
    let value = this.fetchValue(register);

    this.stack.push(value);
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
      return this.lowlevel.fetchRegister(register);
    }

    return this.#registers[register];
  }

  // Load a value into a register

  loadValue<T>(register: Register | MachineRegister, value: T): void {
    if (isLowLevelRegister(register)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.lowlevel.loadRegister(register, value as any as number);
    } else {
      this.#registers[register] = value;
    }
  }

  /**
   * Migrated to Inner
   */

  // Start a new frame and save $ra and $fp on the stack
  pushFrame() {
    this.lowlevel.pushFrame();
  }

  // Restore $ra, $sp and $fp
  popFrame() {
    this.lowlevel.popFrame();
  }

  // Jump to an address in `program`
  goto(offset: number) {
    this.lowlevel.goto(offset);
  }

  // Save $pc into $ra, then jump to a new address in `program` (jal in MIPS)
  call(handle: number) {
    this.lowlevel.call(handle);
  }

  // Put a specific `program` address in $ra
  returnTo(offset: number) {
    this.lowlevel.returnTo(offset);
  }

  // Return to the `program` address stored in $ra
  return() {
    this.lowlevel.return();
  }

  /**
   * End of migrated.
   */

  constructor(
    readonly runtime: RuntimeContext,
    { pc, scope, dynamicScope, stack }: VMState,
    private readonly elementStack: ElementBuilder,
    readonly context: CompileTimeCompilationContext
  ) {
    if (import.meta.env.DEV) {
      assertGlobalContextWasSet!();
    }

    this.resume = initVM(context);
    let evalStack = EvaluationStackImpl.restore(stack);

    assert(typeof pc === 'number', 'pc is a number');

    evalStack[REGISTERS][$pc] = pc;
    evalStack[REGISTERS][$sp] = stack.length - 1;
    evalStack[REGISTERS][$fp] = -1;

    this.#heap = this.program.heap;
    this.constants = this.program.constants;
    this.elementStack = elementStack;
    this.#stacks.scope.push(scope);
    this.#stacks.dynamicScope.push(dynamicScope);
    this.args = new VMArgumentsImpl();
    this.lowlevel = new LowLevelVM(
      evalStack,
      this.#heap,
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

    this.#destructor = {};
    this.#destroyableStack.push(this.#destructor);

    if (LOCAL_DEBUG) {
      this.debug = {
        stacks: this.#stacks,
        destroyableStack: this.#destroyableStack,
        constants: this.constants,
        lowlevel: this.lowlevel,
        registers: this.#registers,
      };
    }
  }

  static initial(
    runtime: RuntimeContext,
    context: CompileTimeCompilationContext,
    { handle, self, dynamicScope, treeBuilder, numSymbols, owner }: InitOptions
  ) {
    let scope = PartialScopeImpl.root(self, numSymbols, owner);
    let state = vmState(runtime.program.heap.getaddr(handle), scope, dynamicScope);
    let vm = initVM(context)(runtime, state, treeBuilder);
    vm.pushUpdating();
    return vm;
  }

  static empty(
    runtime: RuntimeContext,
    { handle, treeBuilder, dynamicScope, owner }: MinimalInitOptions,
    context: CompileTimeCompilationContext
  ) {
    let vm = initVM(context)(
      runtime,
      vmState(
        runtime.program.heap.getaddr(handle),
        PartialScopeImpl.root(UNDEFINED_REFERENCE, 0, owner),
        dynamicScope
      ),
      treeBuilder
    );
    vm.pushUpdating();
    return vm;
  }

  private resume: VmInitCallback;

  compile(block: CompilableTemplate): number {
    let handle = unwrapHandle(block.compile(this.context));

    return handle;
  }

  get program(): RuntimeProgram {
    return this.runtime.program;
  }

  get env(): Environment {
    return this.runtime.env;
  }

  captureState(args: number, pc = this.lowlevel.fetchRegister($pc)): VMState {
    return {
      pc,
      scope: this.scope(),
      dynamicScope: this.dynamicScope(),
      stack: this.stack.capture(args),
    };
  }

  capture(args: number, pc = this.lowlevel.fetchRegister($pc)): ResumableVMState {
    return new ResumableVMStateImpl(this.captureState(args, pc), this.resume);
  }

  beginCacheGroup(name?: string) {
    let opcodes = this.updating();
    let guard = new JumpIfNotModifiedOpcode();

    opcodes.push(guard);
    opcodes.push(new BeginTrackFrameOpcode(name));
    this.#stacks.cache.push(guard);

    beginTrackFrame(name);
  }

  commitCacheGroup() {
    let opcodes = this.updating();
    let guard = expect(this.#stacks.cache.pop(), 'VM BUG: Expected a cache group');

    let tag = endTrackFrame();
    opcodes.push(new EndTrackFrameOpcode(guard));

    guard.finalize(tag, opcodes.length);
  }

  enter(args: number) {
    let updating: UpdatingOpcode[] = [];

    let state = this.capture(args);
    let block = this.elements().pushUpdatableBlock();

    let tryOpcode = new TryOpcode(state, this.runtime, block, updating);

    this.didEnter(tryOpcode);
  }

  enterItem({ key, value, memo }: OpaqueIterationItem): ListItemOpcode {
    let { stack } = this;

    let valueRef = createIteratorItemRef(value);
    let memoRef = createIteratorItemRef(memo);

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

  enterList(iterableRef: Reference<OpaqueIterator>, offset: number) {
    let updating: ListItemOpcode[] = [];

    let addr = this.lowlevel.target(offset);
    let state = this.capture(0, addr);
    let list = this.elements().pushBlockList(updating) as LiveBlockList;

    let opcode = new ListBlockOpcode(state, this.runtime, list, updating, iterableRef);

    this.#stacks.list.push(opcode);

    this.didEnter(opcode);
  }

  private didEnter(opcode: BlockOpcode) {
    this.associateDestroyable(opcode);
    this.#destroyableStack.push(opcode);
    this.updateWith(opcode);
    this.pushUpdating(opcode.children);
  }

  exit() {
    this.#destroyableStack.pop();
    this.elements().popBlock();
    this.popUpdating();
  }

  exitList() {
    this.exit();
    this.#stacks.list.pop();
  }

  pushUpdating(list: UpdatingOpcode[] = []): void {
    this.#stacks.updating.push(list);
  }

  popUpdating(): UpdatingOpcode[] {
    return expect(this.#stacks.updating.pop(), "can't pop an empty stack");
  }

  updateWith(opcode: UpdatingOpcode) {
    this.updating().push(opcode);
  }

  listBlock(): ListBlockOpcode {
    return expect(this.#stacks.list.current, 'expected a list block');
  }

  associateDestroyable(child: Destroyable): void {
    let parent = expect(this.#destroyableStack.current, 'Expected destructor parent');
    associateDestroyableChild(parent, child);
  }

  tryUpdating(): Nullable<UpdatingOpcode[]> {
    return this.#stacks.updating.current;
  }

  updating(): UpdatingOpcode[] {
    return expect(
      this.#stacks.updating.current,
      'expected updating opcode on the updating opcode stack'
    );
  }

  elements(): ElementBuilder {
    return this.elementStack;
  }

  scope(): Scope {
    return expect(this.#stacks.scope.current, 'expected scope on the scope stack');
  }

  dynamicScope(): DynamicScope {
    return expect(
      this.#stacks.dynamicScope.current,
      'expected dynamic scope on the dynamic scope stack'
    );
  }

  pushChildScope() {
    this.#stacks.scope.push(this.scope().child());
  }

  pushDynamicScope(): DynamicScope {
    let child = this.dynamicScope().child();
    this.#stacks.dynamicScope.push(child);
    return child;
  }

  pushRootScope(size: number, owner: Owner): PartialScope {
    let scope = PartialScopeImpl.sized(size, owner);
    this.#stacks.scope.push(scope);
    return scope;
  }

  pushScope(scope: Scope) {
    this.#stacks.scope.push(scope);
  }

  popScope() {
    this.#stacks.scope.pop();
  }

  popDynamicScope() {
    this.#stacks.dynamicScope.pop();
  }

  /// SCOPE HELPERS

  getOwner(): Owner {
    return this.scope().owner;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSelf(): Reference<any> {
    return this.scope().getSelf();
  }

  referenceForSymbol(symbol: number): Reference {
    return this.scope().getSymbol(symbol);
  }

  /// EXECUTION

  execute(initialize?: (vm: this) => void): RenderResult {
    if (import.meta.env.DEV) {
      let hasErrored = true;
      try {
        let value = this._execute(initialize);

        // using a boolean here to avoid breaking ergonomics of "pause on uncaught exceptions"
        // which would happen with a `catch` + `throw`
        hasErrored = false;

        return value;
      } finally {
        if (hasErrored) {
          // If any existing blocks are open, due to an error or something like
          // that, we need to close them all and clean things up properly.
          let elements = this.elements();

          while (elements.hasBlocks) {
            elements.popBlock();
          }

          // eslint-disable-next-line no-console
          console.error(`\n\nError occurred:\n\n${resetTracking()}\n\n`);
        }
      }
    } else {
      return this._execute(initialize);
    }
  }

  private _execute(initialize?: (vm: this) => void): RenderResult {
    if (LOCAL_SHOULD_LOG) {
      LOCAL_LOGGER.log(`EXECUTING FROM ${this.lowlevel.fetchRegister($pc)}`);
    }

    if (initialize) initialize(this);

    let result: RichIteratorResult<null, RenderResult>;

    do result = this.next();
    while (!result.done);

    return result.value;
  }

  next(): RichIteratorResult<null, RenderResult> {
    let { env, elementStack } = this;
    let opcode = this.lowlevel.nextStatement();
    let result: RichIteratorResult<null, RenderResult>;
    if (opcode !== null) {
      this.lowlevel.evaluateOuter(opcode, this);
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
          this.#destructor
        ),
      };
    }
    return result;
  }

  bindDynamicScope(names: string[]) {
    let scope = this.dynamicScope();

    for (const name of reverse(names)) {
      scope.set(name, this.stack.pop<Reference<unknown>>());
    }
  }
}

function vmState(pc: number, scope: Scope, dynamicScope: DynamicScope) {
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
  owner: Owner;
}

export interface InitOptions extends MinimalInitOptions {
  self: Reference;
  numSymbols: number;
}

export type VmInitCallback = (
  this: void,
  runtime: RuntimeContext,
  state: VMState,
  builder: ElementBuilder
) => VM;

function initVM(context: CompileTimeCompilationContext): VmInitCallback {
  return (runtime, state, builder) => new VM(runtime, state, builder, context);
}
