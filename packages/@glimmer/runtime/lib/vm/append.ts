import type {
  BlockMetadata,
  CompilableTemplate,
  DebugTemplates,
  Destroyable,
  DynamicScope,
  Environment,
  EvaluationContext,
  Nullable,
  Owner,
  Program,
  ProgramConstants,
  RenderResult,
  RichIteratorResult,
  Scope,
  SyscallRegisters,
  TreeBuilder,
  UpdatingOpcode,
} from '@glimmer/interfaces';
import type { RuntimeOpImpl } from '@glimmer/program';
import type { OpaqueIterationItem, OpaqueIterator, Reference } from '@glimmer/reference';
import type { MachineRegister, Register, SyscallRegister } from '@glimmer/vm';
import { expect, unwrapHandle } from '@glimmer/debug-util';
import { associateDestroyableChild } from '@glimmer/destroyable';
import { assertGlobalContextWasSet } from '@glimmer/global-context';
import { LOCAL_DEBUG, LOCAL_TRACE_LOGGING } from '@glimmer/local-debug-flags';
import { createIteratorItemRef, UNDEFINED_REFERENCE } from '@glimmer/reference';
import { LOCAL_LOGGER, reverse, Stack } from '@glimmer/util';
import { beginTrackFrame, endTrackFrame, resetTracking } from '@glimmer/validator';
import { $pc, isLowLevelRegister } from '@glimmer/vm';

import type { DebugState } from '../opcodes';
import type { ScopeOptions } from '../scope';
import type { LiveBlockList } from './element-builder';
import type { EvaluationStack } from './stack';
import type { BlockOpcode, VMState } from './update';

import {
  BeginTrackFrameOpcode,
  EndTrackFrameOpcode,
  JumpIfNotModifiedOpcode,
} from '../compiled/opcodes/vm';
import { APPEND_OPCODES } from '../opcodes';
import { ScopeImpl } from '../scope';
import { VMArgumentsImpl } from './arguments';
import { LowLevelVM } from './low-level';
import RenderResultImpl from './render-result';
import EvaluationStackImpl from './stack';
import { ListBlockOpcode, ListItemOpcode, TryOpcode } from './update';

class Stacks {
  readonly drop: object = {};

  readonly scope = new Stack<Scope>();
  readonly dynamicScope = new Stack<DynamicScope>();
  readonly updating = new Stack<UpdatingOpcode[]>();
  readonly cache = new Stack<JumpIfNotModifiedOpcode>();
  readonly list = new Stack<ListBlockOpcode>();
  readonly destroyable = new Stack<object>();

  constructor(scope: Scope, dynamicScope: DynamicScope) {
    this.scope.push(scope);
    this.dynamicScope.push(dynamicScope);
    this.destroyable.push(this.drop);
  }
}

type Handle = number;

let DebugTemplatesImpl: undefined | (new () => DebugTemplates);

if (LOCAL_DEBUG) {
  DebugTemplatesImpl = class DebugTemplatesImpl implements DebugTemplates {
    readonly #templates: Map<Handle, BlockMetadata> = new Map();
    #active: Handle[] = [];

    willCall(handle: Handle): void {
      this.#active.push(handle);
    }

    return(): void {
      this.#active.pop();
    }

    get active(): BlockMetadata | null {
      const current = this.#active.at(-1);
      return current ? this.#templates.get(current) ?? null : null;
    }

    register(handle: Handle, metadata: BlockMetadata): void {
      this.#templates.set(handle, metadata);
    }
  };
}

interface DebugVmState {
  context: EvaluationContext;
  trace: { templates: DebugTemplates };
  lowlevel: LowLevelVM;
  registers: SyscallRegisters;
  destroyableStack: Stack<object>;
  stacks: Stacks;
}

export class VM {
  readonly #stacks: Stacks;
  readonly #destructor: object;
  readonly #destroyableStack = new Stack<object>();
  readonly context: EvaluationContext;
  readonly #tree: TreeBuilder;

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

  /**
   * Fetch a value from a syscall register onto the stack.
   *
   * ## Opcodes
   *
   * - Append: `Fetch`
   *
   * ## State changes
   *
   * [!] push Eval Stack <- $register
   */
  fetch(register: SyscallRegister): void {
    let value = this.fetchValue(register);

    this.stack.push(value);
  }

  /**
   * Load a value from the stack into a syscall register.
   *
   * ## Opcodes
   *
   * - Append: `Load`
   *
   * ## State changes
   *
   * [!] pop Eval Stack -> `value`
   * [$] $register <- `value`
   */
  load(register: SyscallRegister) {
    let value = this.stack.pop();

    this.loadValue(register, value);
  }

  /**
   * Load a value into a syscall register.
   *
   * ## State changes
   *
   * [$] $register <- `value`
   *
   * @utility
   */
  loadValue<T>(register: SyscallRegister, value: T): void {
    this.#registers[register] = value;
  }

  /**
   * Fetch a value from a register (machine or syscall).
   *
   * ## State changes
   *
   * [ ] get $register
   *
   * @utility
   */
  fetchValue(register: MachineRegister): number;
  fetchValue<T>(register: Register): T;
  fetchValue(register: Register | MachineRegister): unknown {
    if (isLowLevelRegister(register)) {
      return this.lowlevel.fetchRegister(register);
    }

    return this.#registers[register];
  }

  // Save $pc into $ra, then jump to a new address in `program` (jal in MIPS)
  call(handle: number | null) {
    if (handle !== null) {
      if (LOCAL_DEBUG) {
        this.debug?.trace.templates.willCall(handle);
      }

      this.lowlevel.call(handle);
    }
  }

  // Return to the `program` address stored in $ra
  return() {
    if (LOCAL_DEBUG) {
      this.debug?.trace.templates.return();
    }

    this.lowlevel.return();
  }

  /**
   * End of migrated.
   */

  constructor(
    { pc, scope, dynamicScope, stack }: ClosureState,
    tree: TreeBuilder,
    context: EvaluationContext
  ) {
    if (import.meta.env.DEV) {
      assertGlobalContextWasSet!();
    }

    let evalStack = EvaluationStackImpl.restore(stack, pc);

    this.context = context;
    this.#tree = tree;

    this.#stacks = new Stacks(scope, dynamicScope);

    this.args = new VMArgumentsImpl();
    this.lowlevel = new LowLevelVM(
      evalStack,
      context,
      import.meta.env.VM_LOCAL_DEV
        ? {
            debugBefore: (opcode: RuntimeOpImpl): DebugState => {
              return APPEND_OPCODES.debugBefore!(this, opcode);
            },

            debugAfter: (state: DebugState): void => {
              APPEND_OPCODES.debugAfter!(this, state);
            },
          }
        : undefined,
      evalStack.registers
    );

    this.#destructor = {};
    this.#destroyableStack.push(this.#destructor);
    associateDestroyableChild(this.#stacks.drop, this.#destructor);

    if (LOCAL_DEBUG) {
      const templates = new DebugTemplatesImpl!();

      this.debug = {
        context: this.context,

        trace: {
          templates,
        },

        stacks: this.#stacks,
        destroyableStack: this.#destroyableStack,
        lowlevel: this.lowlevel,
        registers: this.#registers,
      } satisfies DebugVmState;
    }

    this.pushUpdating();
  }

  static initial(context: EvaluationContext, options: InitialVmState) {
    let scope = ScopeImpl.root(
      options.owner,
      options.scope ?? { self: UNDEFINED_REFERENCE, size: 0 }
    );
    return VM.create({
      ...options,
      scope,
      context,
    });
  }

  static create({
    scope,
    dynamicScope,
    handle,
    tree,
    context,
  }: {
    scope: Scope;
    dynamicScope: DynamicScope;
    handle: number;
    tree: TreeBuilder;
    context: EvaluationContext;
  }) {
    let state = closureState(context.program.heap.getaddr(handle), scope, dynamicScope);
    let vm = new VM(state, tree, context);
    return vm;
  }

  static empty(context: EvaluationContext, options: InitialVmState) {
    let scope = ScopeImpl.root(
      options.owner,
      options.scope ?? { self: UNDEFINED_REFERENCE, size: 0 }
    );

    return VM.create({
      ...options,
      scope,
      context,
    });
  }

  compile(block: CompilableTemplate): number {
    let handle = unwrapHandle(block.compile(this.context));

    if (LOCAL_DEBUG) {
      this.debug?.trace.templates.register(handle, block.meta);
    }

    return handle;
  }

  get constants(): ProgramConstants {
    return this.context.program.constants;
  }

  get program(): Program {
    return this.context.program;
  }

  get env(): Environment {
    return this.context.env;
  }

  captureState(args: number, pc = this.lowlevel.fetchRegister($pc)): VMState {
    return {
      pc,
      scope: this.scope(),
      dynamicScope: this.dynamicScope(),
      stack: this.stack.capture(args),
    };
  }

  private captureClosure(args: number, pc = this.lowlevel.fetchRegister($pc)): ClosureState {
    return {
      pc,
      scope: this.scope(),
      dynamicScope: this.dynamicScope(),
      stack: this.stack.capture(args),
    };
  }

  capture(args: number, pc = this.lowlevel.fetchRegister($pc)): Closure {
    return new Closure(this.captureClosure(args, pc), this.context);
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
    let block = this.tree().pushResettableBlock();

    let tryOpcode = new TryOpcode(state, this.context, block, updating);

    this.didEnter(tryOpcode);
  }

  enterItem({ key, value, memo }: OpaqueIterationItem): ListItemOpcode {
    let { stack } = this;

    let valueRef = createIteratorItemRef(value);
    let memoRef = createIteratorItemRef(memo);

    stack.push(valueRef);
    stack.push(memoRef);

    let state = this.capture(2);
    let block = this.tree().pushResettableBlock();

    let opcode = new ListItemOpcode(state, this.context, block, key, memoRef, valueRef);
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
    let list = this.tree().pushBlockList(updating) as LiveBlockList;

    let opcode = new ListBlockOpcode(state, this.context, list, updating, iterableRef);

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
    this.tree().popBlock();
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

  tree(): TreeBuilder {
    return this.#tree;
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

  pushRootScope(size: number, owner: Owner): Scope {
    let scope = ScopeImpl.sized(owner, size);
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
          let elements = this.tree();

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
    if (LOCAL_TRACE_LOGGING) {
      LOCAL_LOGGER.log(`EXECUTING FROM ${this.lowlevel.fetchRegister($pc)}`);
    }

    if (initialize) initialize(this);

    let result: RichIteratorResult<null, RenderResult>;

    do result = this.next();
    while (!result.done);

    return result.value;
  }

  next(): RichIteratorResult<null, RenderResult> {
    let { env } = this;
    let tree = this.#tree;
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
        value: new RenderResultImpl(env, this.popUpdating(), tree.popBlock(), this.#stacks.drop),
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

export interface InitialVmState {
  handle: number;
  tree: TreeBuilder;
  dynamicScope: DynamicScope;
  owner: Owner;
  scope?: ScopeOptions;
}

function closureState(pc: number, scope: Scope, dynamicScope: DynamicScope): ClosureState {
  return {
    pc,
    scope,
    dynamicScope,
    stack: [],
  };
}

export interface MinimalInitOptions {
  handle: number;
  treeBuilder: TreeBuilder;
  dynamicScope: DynamicScope;
  owner: Owner;
}

export interface InitOptions extends MinimalInitOptions {
  self: Reference;
  numSymbols: number;
}

export interface ClosureState {
  /**
   * The program counter that subsequent evaluations should start from.
   */
  readonly pc: number;

  /**
   * The current value of the VM's scope (which changes whenever a component is invoked or a block
   * with block params is entered).
   */
  readonly scope: Scope;

  /**
   * The current value of the VM's dynamic scope
   */
  readonly dynamicScope: DynamicScope;

  /**
   * A number of stack elements captured during the initial evaluation, and which should be restored
   * to the stack when the block is re-evaluated.
   */
  readonly stack: unknown[];
}

/**
 * A closure captures the state of the VM for a particular block of code that is necessary to
 * re-invoke the block in the future.
 *
 * In practice, this allows us to clear the previous render and "replay" the block's execution,
 * rendering content in the same position as the first render.
 */
export class Closure {
  private state: ClosureState;
  private context: EvaluationContext;

  constructor(state: ClosureState, context: EvaluationContext) {
    this.state = state;
    this.context = context;
  }

  evaluate(tree: TreeBuilder): VM {
    return new VM(this.state, tree, this.context);
  }
}
