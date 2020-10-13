import {
  CompilableTemplate,
  Destroyable,
  DynamicScope,
  Environment,
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
  ElementBuilder,
} from '@glimmer/interfaces';
import { LOCAL_SHOULD_LOG } from '@glimmer/local-debug-flags';
import { RuntimeOpImpl } from '@glimmer/program';
import {
  Reference,
  OpaqueIterationItem,
  OpaqueIterator,
  createIteratorItemRef,
  UNDEFINED_REFERENCE,
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
import { unwrapHandle } from '@glimmer/util';
import {
  JumpIfNotModifiedOpcode,
  BeginTrackFrameOpcode,
  EndTrackFrameOpcode,
} from '../compiled/opcodes/vm';
import { PartialScopeImpl } from '../scope';
import { APPEND_OPCODES, DebugState, UpdatingOpcode } from '../opcodes';
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
import { beginTrackFrame, endTrackFrame, resetTracking } from '@glimmer/validator';
import { DEBUG } from '@glimmer/env';
import { assertGlobalContextWasSet } from '@glimmer/global-context';

/**
 * This interface is used by internal opcodes, and is more stable than
 * the implementation of the Append VM itself.
 */
export interface InternalVM {
  readonly [CONSTANTS]: RuntimeConstants;
  readonly [ARGS]: VMArgumentsImpl;

  readonly env: Environment;
  readonly stack: EvaluationStack;
  readonly runtime: RuntimeContext;
  readonly context: SyntaxCompilationContext;

  loadValue(register: MachineRegister, value: number): void;
  loadValue(register: Register, value: unknown): void;
  loadValue(register: Register | MachineRegister, value: unknown): void;

  fetchValue(register: MachineRegister.ra | MachineRegister.pc): number;
  // TODO: Something better than a type assertion?
  fetchValue<T>(register: Register): T;
  fetchValue(register: Register): unknown;

  load(register: Register): void;
  fetch(register: Register): void;

  compile(block: CompilableTemplate): number;

  scope(): Scope;
  elements(): ElementBuilder;

  getSelf(): Reference;

  updateWith(opcode: UpdatingOpcode): void;

  associateDestroyable(d: Destroyable): void;

  beginCacheGroup(name?: string): void;
  commitCacheGroup(): void;

  /// Iteration ///

  enterList(iterableRef: Reference<OpaqueIterator>, offset: number): void;
  exitList(): void;
  enterItem(item: OpaqueIterationItem): ListItemOpcode;
  registerItem(item: ListItemOpcode): void;

  pushRootScope(size: number): PartialScope;
  pushChildScope(): void;
  popScope(): void;
  pushScope(scope: Scope): void;

  dynamicScope(): DynamicScope;
  bindDynamicScope(names: string[]): void;
  pushDynamicScope(): void;
  popDynamicScope(): void;

  enter(args: number): void;
  exit(): void;

  goto(pc: number): void;
  call(handle: number): void;
  pushFrame(): void;

  referenceForSymbol(symbol: number): Reference;

  execute(initialize?: (vm: this) => void): RenderResult;
  pushUpdating(list?: UpdatingOpcode[]): void;
  next(): RichIteratorResult<null, RenderResult>;
}

class Stacks {
  readonly scope = new Stack<Scope>();
  readonly dynamicScope = new Stack<DynamicScope>();
  readonly updating = new Stack<UpdatingOpcode[]>();
  readonly cache = new Stack<JumpIfNotModifiedOpcode>();
  readonly list = new Stack<ListBlockOpcode>();
}

export default class VM implements PublicVM, InternalVM {
  private readonly [STACKS] = new Stacks();
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
    let value = this.fetchValue(register);

    this.stack.pushJs(value);
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
    private readonly elementStack: ElementBuilder,
    readonly context: SyntaxCompilationContext
  ) {
    if (DEBUG) {
      assertGlobalContextWasSet!();
    }

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

  static initial(
    runtime: RuntimeContext,
    context: SyntaxCompilationContext,
    { handle, self, dynamicScope, treeBuilder }: InitOptions
  ) {
    let scopeSize = runtime.program.heap.scopesizeof(handle);
    let scope = PartialScopeImpl.root(self, scopeSize);
    let state = vmState(runtime.program.heap.getaddr(handle), scope, dynamicScope);
    let vm = initVM(context)(runtime, state, treeBuilder);
    vm.pushUpdating();
    return vm;
  }

  static empty(
    runtime: RuntimeContext,
    { handle, treeBuilder, dynamicScope }: MinimalInitOptions,
    context: SyntaxCompilationContext
  ) {
    let vm = initVM(context)(
      runtime,
      vmState(
        runtime.program.heap.getaddr(handle),
        PartialScopeImpl.root(UNDEFINED_REFERENCE, 0),
        dynamicScope
      ),
      treeBuilder
    );
    vm.pushUpdating();
    return vm;
  }

  private resume: VmInitCallback = initVM(this.context);

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

  captureState(args: number, pc = this[INNER_VM].fetchRegister($pc)): VMState {
    return {
      pc,
      dynamicScope: this.dynamicScope(),
      scope: this.scope(),
      stack: this.stack.capture(args),
    };
  }

  capture(args: number, pc = this[INNER_VM].fetchRegister($pc)): ResumableVMState {
    return new ResumableVMStateImpl(this.captureState(args, pc), this.resume);
  }

  beginCacheGroup(name?: string) {
    let opcodes = this.updating();
    let guard = new JumpIfNotModifiedOpcode();

    opcodes.push(guard);
    opcodes.push(new BeginTrackFrameOpcode(name));
    this[STACKS].cache.push(guard);

    beginTrackFrame(name);
  }

  commitCacheGroup() {
    let opcodes = this.updating();
    let guard = expect(this[STACKS].cache.pop(), 'VM BUG: Expected a cache group');

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

    stack.pushJs(valueRef);
    stack.pushJs(memoRef);

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

    let addr = this[INNER_VM].target(offset);
    let state = this.capture(0, addr);
    let list = this.elements().pushBlockList(updating) as LiveBlockList;

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

  scope(): Scope {
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

  pushRootScope(size: number): PartialScope {
    let scope = PartialScopeImpl.sized(size);
    this[STACKS].scope.push(scope);
    return scope;
  }

  pushScope(scope: Scope) {
    this[STACKS].scope.push(scope);
  }

  popScope() {
    this[STACKS].scope.pop();
  }

  popDynamicScope() {
    this[STACKS].dynamicScope.pop();
  }

  /// SCOPE HELPERS

  getSelf(): Reference<any> {
    return this.scope().getSelf();
  }

  referenceForSymbol(symbol: number): Reference {
    return this.scope().getSymbol(symbol);
  }

  /// EXECUTION

  execute(initialize?: (vm: this) => void): RenderResult {
    if (DEBUG) {
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

          console.error(`\n\nError occurred while rendering:\n\n${resetTracking()}\n\n`);
        }
      }
    } else {
      return this._execute(initialize);
    }
  }

  private _execute(initialize?: (vm: this) => void): RenderResult {
    if (LOCAL_SHOULD_LOG) {
      console.log(`EXECUTING FROM ${this[INNER_VM].fetchRegister($pc)}`);
    }

    if (initialize) initialize(this);

    let result: RichIteratorResult<null, RenderResult>;

    while (true) {
      result = this.next();
      if (result.done) break;
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

  bindDynamicScope(names: string[]) {
    let scope = this.dynamicScope();

    for (let i = names.length - 1; i >= 0; i--) {
      let name = names[i];
      scope.set(name, this.stack.popJs<Reference<unknown>>());
    }
  }
}

function vmState(
  pc: number,
  scope: Scope = PartialScopeImpl.root(UNDEFINED_REFERENCE, 0),
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
  self: Reference;
}

export type VmInitCallback = (
  this: void,
  runtime: RuntimeContext,
  state: VMState,
  builder: ElementBuilder
) => InternalVM;

function initVM(context: SyntaxCompilationContext): VmInitCallback {
  return (runtime, state, builder) => new VM(runtime, state, builder, context);
}
