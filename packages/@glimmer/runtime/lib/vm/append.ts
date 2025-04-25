import type {
  BlockMetadata,
  CompilableTemplate,
  DebugStacks,
  DebugTemplates,
  DebugVmSnapshot,
  DebugVmTrace,
  Destroyable,
  DynamicScope,
  Environment,
  EvaluationContext,
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
import type { OpaqueIterationItem, OpaqueIterator, Reference } from '@glimmer/reference';
import type { MachineRegister, Register, SyscallRegister } from '@glimmer/vm';
import { dev, expect, unwrapHandle } from '@glimmer/debug-util';
import { associateDestroyableChild } from '@glimmer/destroyable';
import { assertGlobalContextWasSet } from '@glimmer/global-context';
import { LOCAL_DEBUG, LOCAL_TRACE_LOGGING } from '@glimmer/local-debug-flags';
import { createIteratorItemRef, UNDEFINED_REFERENCE } from '@glimmer/reference';
import { LOCAL_LOGGER, reverse, Stack } from '@glimmer/util';
import { beginTrackFrame, endTrackFrame, resetTracking } from '@glimmer/validator';
import { $pc, isLowLevelRegister } from '@glimmer/vm';

import type { ScopeOptions } from '../scope';
import type { AppendingBlockList } from './element-builder';
import type { EvaluationStack } from './stack';
import type { BlockOpcode } from './update';

import {
  BeginTrackFrameOpcode,
  EndTrackFrameOpcode,
  JumpIfNotModifiedOpcode,
} from '../compiled/opcodes/vm';
import { externs } from '../opcodes';
import { ScopeImpl } from '../scope';
import { VMArgumentsImpl } from './arguments';
import { LowLevelVM } from './low-level';
import RenderResultImpl from './render-result';
import EvaluationStackImpl from './stack';
import { ListBlockOpcode, ListItemOpcode, TryOpcode } from './update';

class Stacks {
  declare debug?: () => DebugStacks;
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

    if (LOCAL_DEBUG) {
      this.debug = (): DebugStacks => {
        return {
          scope: this.scope.snapshot(),
          dynamicScope: this.dynamicScope.snapshot(),
          updating: this.updating.snapshot(),
          cache: this.cache.snapshot(),
          list: this.list.snapshot(),
          destroyable: this.destroyable.snapshot(),
        };
      };
    }
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
      return current ? (this.#templates.get(current) ?? null) : null;
    }

    register(handle: Handle, metadata: BlockMetadata): void {
      this.#templates.set(handle, metadata);
    }
  };
}

export class VM {
  readonly #stacks: Stacks;
  readonly args: VMArgumentsImpl;
  readonly lowlevel: LowLevelVM;

  readonly debug?: () => DebugVmSnapshot;
  readonly trace?: () => DebugVmTrace;

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
        dev(this.trace).willCall(handle);
      }

      this.lowlevel.call(handle);
    }
  }

  // Return to the `program` address stored in $ra
  return() {
    if (LOCAL_DEBUG) {
      dev(this.trace).return();
    }

    this.lowlevel.return();
  }

  readonly #tree: TreeBuilder;
  readonly context: EvaluationContext;

  constructor(
    { scope, dynamicScope, stack, pc }: ClosureState,
    context: EvaluationContext,
    tree: TreeBuilder
  ) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
      assertGlobalContextWasSet!();
    }

    let evalStack = EvaluationStackImpl.restore(stack, pc);

    this.#tree = tree;
    this.context = context;

    this.#stacks = new Stacks(scope, dynamicScope);

    this.args = new VMArgumentsImpl();
    this.lowlevel = new LowLevelVM(evalStack, context, externs(this), evalStack.registers);

    if (LOCAL_DEBUG) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
      const templates = new DebugTemplatesImpl!();

      this.trace = () => templates;

      this.debug = () => ({
        context,

        trace: templates,

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
        elements: this.tree().debug!(),

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
        stacks: this.#stacks.debug!(),

        template: templates.active,
        scope: this.scope().snapshot(),
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
        stack: this.lowlevel.stack.snapshot!(),
        registers: [
          ...this.lowlevel.registers,
          ...sliceTuple(this.#registers, this.lowlevel.registers),
        ],
      });
    }

    this.pushUpdating();
  }

  static initial(context: EvaluationContext, options: InitialVmState) {
    let scope = ScopeImpl.root(
      options.owner,
      options.scope ?? { self: UNDEFINED_REFERENCE, size: 0 }
    );

    const state = closureState(
      context.program.heap.getaddr(options.handle),
      scope,
      options.dynamicScope
    );

    return new VM(state, context, options.tree);
  }

  compile(block: CompilableTemplate): number {
    let handle = unwrapHandle(block.compile(this.context));

    if (LOCAL_DEBUG) {
      dev(this.trace).register(handle, block.meta);
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

  /**
   * ## Opcodes
   *
   * - Append: `BeginComponentTransaction`
   *
   * ## State Changes
   *
   * [ ] create `guard` (`JumpIfNotModifiedOpcode`)
   * [ ] create `tracker` (`BeginTrackFrameOpcode`)
   * [!] push Updating Stack <- `guard`
   * [!] push Updating Stack <- `tracker`
   * [!] push Cache Stack <- `guard`
   * [!] push Tracking Stack
   */
  beginCacheGroup(name?: string) {
    let opcodes = this.updating();
    let guard = new JumpIfNotModifiedOpcode();

    opcodes.push(guard);
    opcodes.push(new BeginTrackFrameOpcode(name));
    this.#stacks.cache.push(guard);

    beginTrackFrame(name);
  }

  /**
   * ## Opcodes
   *
   * - Append: `CommitComponentTransaction`
   *
   * ## State Changes
   *
   * Create a new `EndTrackFrameOpcode` (`end`)
   *
   * [!] pop CacheStack -> `guard`
   * [!] pop Tracking Stack -> `tag`
   * [ ] create `end` (`EndTrackFrameOpcode`) with `guard`
   * [-] consume `tag`
   */
  commitCacheGroup() {
    let opcodes = this.updating();
    let guard = expect(this.#stacks.cache.pop(), 'VM BUG: Expected a cache group');

    let tag = endTrackFrame();
    opcodes.push(new EndTrackFrameOpcode(guard));

    guard.finalize(tag, opcodes.length);
  }

  /**
   * ## Opcodes
   *
   * - Append: `Enter`
   *
   * ## State changes
   *
   * [!] push Element Stack as `block`
   * [ ] create `try` (`TryOpcode`) with `block`, capturing `args` from the Eval Stack
   *
   * Did Enter (`try`):
   * [-] associate destroyable `try`
   * [!] push Destroyable Stack <- `try`
   * [!] push Updating List <- `try`
   * [!] push Updating Stack <- `try.children`
   */
  enter(args: number) {
    let updating: UpdatingOpcode[] = [];

    let state = this.capture(args);
    let block = this.tree().pushResettableBlock();

    let tryOpcode = new TryOpcode(state, this.context, block, updating);

    this.didEnter(tryOpcode);
  }

  /**
   * ## Opcodes
   *
   * - Append: `Iterate`
   * - Update: `ListBlock`
   *
   * ## State changes
   *
   * Create a new ref for the iterator item (`value`).
   * Create a new ref for the iterator key (`key`).
   *
   * [ ] create `valueRef` (`Reference`) from `value`
   * [ ] create `keyRef` (`Reference`) from `key`
   * [!] push Eval Stack <- `valueRef`
   * [!] push Eval Stack <- `keyRef`
   * [!] push Element Stack <- `UpdatableBlock` as `block`
   * [ ] capture `closure` with *2* items from the Eval Stack
   * [ ] create `iteration` (`ListItemOpcode`) with `closure`, `block`, `key`, `keyRef` and `valueRef`
   *
   * Did Enter (`iteration`):
   * [-] associate destroyable `iteration`
   * [!] push Destroyable Stack <- `iteration`
   * [!] push Updating List <- `iteration`
   * [!] push Updating Stack <- `iteration.children`
   */
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

  /**
   * ## Opcodes
   *
   * - Append: `EnterList`
   *
   * ## State changes
   *
   * [ ] capture `closure` with *0* items from the Eval Stack, and `$pc` from `offset`
   * [ ] create `updating` (empty `Array`)
   * [!] push Element Stack <- `list` (`BlockList`) with `updating`
   * [ ] create `list` (`ListBlockOpcode`) with `closure`, `list`, `updating` and `iterableRef`
   * [!] push List Stack <- `list`
   *
   * Did Enter (`list`):
   * [-] associate destroyable `list`
   * [!] push Destroyable Stack <- `list`
   * [!] push Updating List <- `list`
   * [!] push Updating Stack <- `list.children`
   */
  enterList(iterableRef: Reference<OpaqueIterator>, offset: number) {
    let updating: ListItemOpcode[] = [];

    let addr = this.lowlevel.target(offset);
    let state = this.capture(0, addr);
    let list = this.tree().pushBlockList(updating) as AppendingBlockList;

    let opcode = new ListBlockOpcode(state, this.context, list, updating, iterableRef);

    this.#stacks.list.push(opcode);

    this.didEnter(opcode);
  }

  /**
   * ## Opcodes
   *
   * - Append: `Enter`
   * - Append: `Iterate`
   * - Append: `EnterList`
   * - Update: `ListBlock`
   *
   * ## State changes
   *
   * [-] associate destroyable `opcode`
   * [!] push Destroyable Stack <- `opcode`
   * [!] push Updating List <- `opcode`
   * [!] push Updating Stack <- `opcode.children`
   *
   */
  private didEnter(opcode: BlockOpcode) {
    this.associateDestroyable(opcode);
    this.#stacks.destroyable.push(opcode);
    this.updateWith(opcode);
    this.pushUpdating(opcode.children);
  }

  /**
   * ## Opcodes
   *
   * - Append: `Exit`
   * - Append: `ExitList`
   *
   * ## State changes
   *
   * [!] pop Destroyable Stack
   * [!] pop Element Stack
   * [!] pop Updating Stack
   */
  exit() {
    this.#stacks.destroyable.pop();
    this.#tree.popBlock();
    this.popUpdating();
  }

  /**
   * ## Opcodes
   *
   * - Append: `ExitList`
   *
   * ## State changes
   *
   * Pop List:
   * [!] pop Destroyable Stack
   * [!] pop Element Stack
   * [!] pop Updating Stack
   *
   * [!] pop List Stack
   */
  exitList() {
    this.exit();
    this.#stacks.list.pop();
  }

  /**
   * ## Opcodes
   *
   * - Append: `RootScope`
   * - Append: `VirtualRootScope`
   *
   * ## State changes
   *
   * [!] push Scope Stack
   */
  pushRootScope(size: number, owner: Owner): Scope {
    let scope = ScopeImpl.sized(owner, size);
    this.#stacks.scope.push(scope);
    return scope;
  }

  /**
   * ## Opcodes
   *
   * - Append: `ChildScope`
   *
   * ## State changes
   *
   * [!] push Scope Stack <- `child` of current Scope
   */
  pushChildScope() {
    this.#stacks.scope.push(this.scope().child());
  }

  /**
   * ## Opcodes
   *
   * - Append: `Yield`
   *
   * ## State changes
   *
   * [!] push Scope Stack <- `scope`
   */
  pushScope(scope: Scope) {
    this.#stacks.scope.push(scope);
  }

  /**
   * ## Opcodes
   *
   * - Append: `PopScope`
   *
   * ## State changes
   *
   * [!] pop Scope Stack
   */
  popScope() {
    this.#stacks.scope.pop();
  }

  /**
   * ## Opcodes
   *
   * - Append: `PushDynamicScope`
   *
   * ## State changes:
   *
   * [!] push Dynamic Scope Stack <- child of current Dynamic Scope
   */
  pushDynamicScope(): DynamicScope {
    let child = this.dynamicScope().child();
    this.#stacks.dynamicScope.push(child);
    return child;
  }

  /**
   * ## Opcodes
   *
   * - Append: `BindDynamicScope`
   *
   * ## State changes:
   *
   * [!] pop Dynamic Scope Stack `names.length` times
   */
  bindDynamicScope(names: string[]) {
    let scope = this.dynamicScope();

    for (const name of reverse(names)) {
      scope.set(name, this.stack.pop<Reference>());
    }
  }

  /**
   * ## State changes
   *
   * - [!] push Updating Stack
   *
   * @utility
   */
  pushUpdating(list: UpdatingOpcode[] = []): void {
    this.#stacks.updating.push(list);
  }

  /**
   * ## State changes
   *
   * [!] pop Updating Stack
   *
   * @utility
   */
  popUpdating(): UpdatingOpcode[] {
    return expect(this.#stacks.updating.pop(), "can't pop an empty stack");
  }

  /**
   * ## State changes
   *
   * [!] push Updating List
   *
   * @utility
   */
  updateWith(opcode: UpdatingOpcode) {
    this.updating().push(opcode);
  }

  private listBlock(): ListBlockOpcode {
    return expect(this.#stacks.list.current, 'expected a list block');
  }

  /**
   * ## State changes
   *
   * [-] associate destroyable `child`
   *
   * @utility
   */
  associateDestroyable(child: Destroyable): void {
    let parent = expect(this.#stacks.destroyable.current, 'Expected destructor parent');
    associateDestroyableChild(parent, child);
  }

  private updating(): UpdatingOpcode[] {
    return expect(
      this.#stacks.updating.current,
      'expected updating opcode on the updating opcode stack'
    );
  }

  /**
   * Get Tree Builder
   */
  tree(): TreeBuilder {
    return this.#tree;
  }

  /**
   * Get current Scope
   */
  scope(): Scope {
    return expect(this.#stacks.scope.current, 'expected scope on the scope stack');
  }

  /**
   * Get current Dynamic Scope
   */
  dynamicScope(): DynamicScope {
    return expect(
      this.#stacks.dynamicScope.current,
      'expected dynamic scope on the dynamic scope stack'
    );
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
          this.#tree.popBlock(),
          this.#stacks.drop
        ),
      };
    }
    return result;
  }
}

function closureState(pc: number, scope: Scope, dynamicScope: DynamicScope): ClosureState {
  return {
    pc,
    scope,
    dynamicScope,
    stack: [],
  };
}

export interface InitialVmState {
  /**
   * The address of the compiled template. This is converted into a
   * pc when the VM is created.
   */
  handle: number;

  /**
   * Optionally, specify the root scope for the VM. If not specified,
   * the VM will use a root scope with no `this` reference and no
   * symbols.
   */
  scope?: ScopeOptions;
  /**
   *
   */
  tree: TreeBuilder;
  dynamicScope: DynamicScope;
  owner: Owner;
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
    return new VM(this.state, this.context, tree);
  }
}

function sliceTuple<T extends unknown[], Prefix extends unknown[]>(
  tuple: T,
  prefix: Prefix
): T extends [...Prefix, ...infer Rest] ? Rest : never {
  return tuple.slice(prefix.length) as T extends [...Prefix, ...infer Rest] ? Rest : never;
}
