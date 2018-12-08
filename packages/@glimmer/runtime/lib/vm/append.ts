import {
  Register,
  $pc,
  MachineRegister,
  isLowLevelRegister,
  $sp,
  $fp,
  SyscallRegister,
  $s0,
  $s1,
  $t0,
  $t1,
  $v0,
} from '@glimmer/vm';
import { ScopeImpl, DynamicScope, Environment, Scope, PartialScope } from '../environment';
import { ElementBuilder, LiveBlock } from './element-builder';
import {
  Option,
  Stack,
  LinkedList,
  ListSlice,
  Opaque,
  expect,
  Drop,
  associateDestructor,
  isDrop,
  destructor,
  SymbolDestroyable,
  Destroyable,
} from '@glimmer/util';
import {
  ReferenceIterator,
  PathReference,
  VersionedPathReference,
  combineSlice,
} from '@glimmer/reference';
import { RuntimeConstants } from '@glimmer/program';
import { LabelOpcode, JumpIfNotModifiedOpcode, DidModifyOpcode } from '../compiled/opcodes/vm';
import LowLevelVM, { Program, LowLevelRegisters, initializeRegisters } from './low-level';
import { VMState, ListBlockOpcode, TryOpcode, BlockOpcode, Runtime } from './update';
import RenderResult from './render-result';
import EvaluationStackImpl, { EvaluationStack } from './stack';
import { Arguments } from './arguments';

import { APPEND_OPCODES, UpdatingOpcode, DebugState } from '../opcodes';

import { UNDEFINED_REFERENCE } from '../references';

import { Heap, Opcode } from '@glimmer/program';
import { DEBUG } from '@glimmer/local-debug-flags';
import { HEAP, INNER_VM, DESTRUCTOR_STACK, CONSTANTS, ARGS, REGISTERS, STACKS } from '../symbols';
import { RichIteratorResult } from '@glimmer/interfaces';
import { Checker, check, CheckOpaque } from '@glimmer/debug';

/**
 * This is used in the Glimmer Embedding API. In particular, embeddings
 * provide helpers through the `CompileTimeLookup` interface, and the
 * helpers they provide implement the `Helper` interface, which is a
 * function that takes a `PublicVM` as a parameter.
 */
export interface PublicVM {
  env: Environment;
  dynamicScope(): DynamicScope;
  getSelf(): PathReference<Opaque>;
  associateDestroyable(child: SymbolDestroyable | Destroyable): void;
}

/**
 * This interface is used by internal opcodes, and is more stable than
 * the implementation of the Append VM itself.
 */
export interface InternalVM {
  readonly [CONSTANTS]: RuntimeConstants<unknown>;

  readonly env: Environment;
  readonly stack: EvaluationStack;

  loadValue(register: MachineRegister, value: number, assertion: Checker<number>): void;
  loadValue<T>(register: Register, value: T, assertion: Checker<T>): void;
  loadValue<T>(register: Register | MachineRegister, value: unknown, assertion: Checker<T>): void;

  fetchValue(register: MachineRegister.ra | MachineRegister.pc): number;
  // TODO: Something better than a type assertion?
  fetchValue<T>(register: Register): T;
  fetchValue(register: Register): unknown;

  load(register: Register): void;
  fetch(register: Register): void;

  scope(): ScopeImpl;
  elements(): ElementBuilder;

  getSelf(): PathReference<unknown>;

  updateWith(opcode: UpdatingOpcode): void;

  associateDestroyable(d: SymbolDestroyable | Destroyable): void;

  beginCacheGroup(): void;
  commitCacheGroup(): void;

  /// Iteration ///

  enterList(offset: number): void;
  exitList(): void;
  iterate(memo: PathReference<unknown>, item: PathReference<unknown>): TryOpcode;
  enterItem(key: string, opcode: TryOpcode): void;

  // TODO: bindCallerScope can be deleted
  pushRootScope(size: number, bindCallerScope: boolean): PartialScope;
  pushChildScope(): void;
  popScope(): void;
  pushScope(scope: Scope): void;

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
}

export interface RuntimeProgram<Locator> extends Program {
  heap: Heap;
  constants: RuntimeConstants<Locator>;
}

class Stacks {
  readonly scope = new Stack<ScopeImpl>();
  readonly dynamicScope = new Stack<DynamicScope>();
  readonly updating = new Stack<LinkedList<UpdatingOpcode>>();
  readonly cache = new Stack<Option<UpdatingOpcode>>();
  readonly list = new Stack<ListBlockOpcode>();
}

export default class VM<T> implements PublicVM, InternalVM {
  private [STACKS] = new Stacks();
  private readonly destructor: object;
  readonly [CONSTANTS]: RuntimeConstants<T>;
  readonly [ARGS]: Arguments;
  readonly [HEAP]: Heap;
  readonly [INNER_VM]: LowLevelVM;
  readonly [REGISTERS]: LowLevelRegisters = initializeRegisters();
  readonly [DESTRUCTOR_STACK] = new Stack<object>();

  get stack(): EvaluationStackImpl {
    return this[INNER_VM].stack as EvaluationStackImpl;
  }

  currentBlock(): LiveBlock {
    return this.elements().block();
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

    this.loadValue(register, value, CheckOpaque);
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

  loadValue<T>(register: Register | MachineRegister, value: T, assertion: Checker<T>): void {
    check(value, assertion);

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

  static initial<T>(
    program: RuntimeProgram<T>,
    env: Environment,
    self: PathReference<Opaque>,
    dynamicScope: DynamicScope,
    elementStack: ElementBuilder,
    handle: number
  ) {
    let scopeSize = program.heap.scopesizeof(handle);
    let scope = ScopeImpl.root(self, scopeSize);
    let vm = new VM(
      { program, env },
      { pc: program.heap.getaddr(handle), scope, dynamicScope, stack: [] },
      elementStack
    );
    vm.pushUpdating();
    return vm;
  }

  static empty<T>(
    program: RuntimeProgram<T>,
    env: Environment,
    elementStack: ElementBuilder,
    handle: number
  ) {
    let dynamicScope: DynamicScope = {
      get() {
        return UNDEFINED_REFERENCE;
      },
      set() {
        return UNDEFINED_REFERENCE;
      },
      child() {
        return dynamicScope;
      },
    };

    let vm = new VM(
      { program, env },
      {
        pc: program.heap.getaddr(handle),
        scope: ScopeImpl.root(UNDEFINED_REFERENCE, 0),
        dynamicScope,
        stack: [],
      },
      elementStack
    );
    vm.pushUpdating();
    return vm;
  }

  static resume(state: VMState, runtime: Runtime, builder: ElementBuilder) {
    return new VM(runtime, state, builder);
  }

  constructor(
    private readonly runtime: Runtime,
    { pc, scope, dynamicScope, stack }: VMState,
    private readonly elementStack: ElementBuilder
  ) {
    let evalStack = EvaluationStackImpl.restore(stack);
    evalStack[REGISTERS][$pc] = pc;
    evalStack[REGISTERS][$sp] = stack.length - 1;
    evalStack[REGISTERS][$fp] = -1;

    this[HEAP] = this.program.heap;
    this[CONSTANTS] = this.program.constants;
    this.elementStack = elementStack;
    this[STACKS].scope.push(scope);
    this[STACKS].dynamicScope.push(dynamicScope);
    this[ARGS] = new Arguments();
    this[INNER_VM] = new LowLevelVM(
      evalStack,
      this[HEAP],
      runtime.program,
      {
        debugBefore: (opcode: Opcode): DebugState => {
          return APPEND_OPCODES.debugBefore(this, opcode);
        },

        debugAfter: (state: DebugState): void => {
          APPEND_OPCODES.debugAfter(this, state);
        },
      },
      evalStack[REGISTERS]
    );

    this.destructor = {};
    this[DESTRUCTOR_STACK].push(this.destructor);
  }

  get program(): RuntimeProgram<Opaque> {
    return this.runtime.program;
  }

  get env(): Environment {
    return this.runtime.env;
  }

  capture(args: number, pc = this[INNER_VM].fetchRegister($pc)): VMState {
    return {
      pc,
      dynamicScope: this.dynamicScope(),
      scope: this.scope(),
      stack: this.stack.capture(args),
    };
  }

  beginCacheGroup() {
    this[STACKS].cache.push(this.updating().tail());
  }

  commitCacheGroup() {
    //        JumpIfNotModified(END)
    //        (head)
    //        (....)
    //        (tail)
    //        DidModify
    // END:   Noop

    let END = new LabelOpcode('END');

    let opcodes = this.updating();
    let marker = this[STACKS].cache.pop();
    let head = marker ? opcodes.nextNode(marker) : opcodes.head();
    let tail = opcodes.tail();
    let tag = combineSlice(new ListSlice(head, tail));

    let guard = new JumpIfNotModifiedOpcode(tag, END);

    opcodes.insertBefore(guard, head);
    opcodes.append(new DidModifyOpcode(guard));
    opcodes.append(END);
  }

  enter(args: number) {
    let updating = new LinkedList<UpdatingOpcode>();

    let state = this.capture(args);
    let block = this.elements().pushUpdatableBlock();

    let tryOpcode = new TryOpcode(state, this.runtime, block, updating);

    this.didEnter(tryOpcode);
  }

  iterate(memo: VersionedPathReference<Opaque>, value: VersionedPathReference<Opaque>): TryOpcode {
    let stack = this.stack;
    stack.push(value);
    stack.push(memo);

    let state = this.capture(2);
    let block = this.elements().pushUpdatableBlock();

    // let ip = this.ip;
    // this.ip = end + 4;
    // this.frames.push(ip);

    return new TryOpcode(state, this.runtime, block, new LinkedList<UpdatingOpcode>());
  }

  enterItem(key: string, opcode: TryOpcode) {
    this.listBlock().map[key] = opcode;
    this.didEnter(opcode);
  }

  enterList(offset: number) {
    let updating = new LinkedList<BlockOpcode>();

    let addr = this[INNER_VM].target(offset);
    let state = this.capture(0, addr);
    let list = this.elements().pushBlockList(updating);
    let artifacts = this.stack.peek<ReferenceIterator>().artifacts;

    let opcode = new ListBlockOpcode(state, this.runtime, list, updating, artifacts);

    this[STACKS].list.push(opcode);

    this.didEnter(opcode);
  }

  private didEnter(opcode: BlockOpcode) {
    this.associateDestructor(destructor(opcode));
    this[DESTRUCTOR_STACK].push(opcode);
    this.updateWith(opcode);
    this.pushUpdating(opcode.children);
  }

  exit() {
    this[DESTRUCTOR_STACK].pop();
    this.elements().popBlock();
    this.popUpdating();

    let parent = this.updating().tail() as BlockOpcode;

    parent.didInitializeChildren();
  }

  exitList() {
    this.exit();
    this[STACKS].list.pop();
  }

  pushUpdating(list = new LinkedList<UpdatingOpcode>()): void {
    this[STACKS].updating.push(list);
  }

  popUpdating(): LinkedList<UpdatingOpcode> {
    return expect(this[STACKS].updating.pop(), "can't pop an empty stack");
  }

  updateWith(opcode: UpdatingOpcode) {
    this.updating().append(opcode);
  }

  listBlock(): ListBlockOpcode {
    return expect(this[STACKS].list.current, 'expected a list block');
  }

  associateDestructor(child: Drop): void {
    if (!isDrop(child)) return;
    let parent = expect(this[DESTRUCTOR_STACK].current, 'Expected destructor parent');
    associateDestructor(parent, child);
  }

  associateDestroyable(child: SymbolDestroyable | Destroyable): void {
    this.associateDestructor(destructor(child));
  }

  tryUpdating(): Option<LinkedList<UpdatingOpcode>> {
    return this[STACKS].updating.current;
  }

  updating(): LinkedList<UpdatingOpcode> {
    return expect(
      this[STACKS].updating.current,
      'expected updating opcode on the updating opcode stack'
    );
  }

  elements(): ElementBuilder {
    return this.elementStack;
  }

  scope(): ScopeImpl {
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

  pushRootScope(size: number, bindCaller: boolean): PartialScope {
    let scope = ScopeImpl.sized(size);
    if (bindCaller) scope.bindCallerScope(this.scope());
    this[STACKS].scope.push(scope);
    return scope;
  }

  pushScope(scope: ScopeImpl) {
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

  execute(initialize?: (vm: VM<T>) => void): RenderResult {
    if (DEBUG) {
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
        value: new RenderResult(env, this.popUpdating(), elementStack.popBlock(), this.destructor),
      };
    }
    return result;
  }

  bindDynamicScope(names: number[]) {
    let scope = this.dynamicScope();

    for (let i = names.length - 1; i >= 0; i--) {
      let name = this[CONSTANTS].getString(names[i]);
      scope.set(name, this.stack.pop<VersionedPathReference<Opaque>>());
    }
  }
}
