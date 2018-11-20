import { Register } from '@glimmer/vm';
import { Scope, DynamicScope, Environment } from '../environment';
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
import LowLevelVM, { Program } from './low-level';
import { VMState, ListBlockOpcode, TryOpcode, BlockOpcode, Runtime } from './update';
import RenderResult from './render-result';
import EvaluationStack from './stack';
import { Arguments } from './arguments';

import { APPEND_OPCODES, UpdatingOpcode, DebugState } from '../opcodes';

import { UNDEFINED_REFERENCE } from '../references';

import { Heap, Opcode } from '@glimmer/program';
import { DEBUG } from '@glimmer/local-debug-flags';
import { HEAP, INNER_VM, DESTRUCTOR_STACK, CONSTANTS, ARGS } from '../symbols';

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
 * This is needed because the normal IteratorResult in the TypeScript
 * standard library is generic over the value in each tick and not over
 * the return value. It represents a standard ECMAScript IteratorResult.
 */
export type IteratorResult<T> =
  | {
      done: false;
      value: null;
    }
  | {
      done: true;
      value: T;
    };

export interface RuntimeProgram<Locator> extends Program {
  heap: Heap;
  constants: RuntimeConstants<Locator>;
}

class Stacks {
  readonly scope = new Stack<Scope>();
  readonly dynamicScope = new Stack<DynamicScope>();
  readonly updating = new Stack<LinkedList<UpdatingOpcode>>();
  readonly cache = new Stack<Option<UpdatingOpcode>>();
  readonly list = new Stack<ListBlockOpcode>();
}

export default class VM<T> implements PublicVM {
  private stacks = new Stacks();
  private readonly destructor: object;
  readonly [CONSTANTS]: RuntimeConstants<T>;
  readonly [ARGS]: Arguments;
  readonly [HEAP]: Heap;
  readonly [INNER_VM]: LowLevelVM;
  readonly [DESTRUCTOR_STACK] = new Stack<object>();

  get stack(): EvaluationStack {
    return this[INNER_VM].stack as EvaluationStack;
  }

  currentBlock(): LiveBlock {
    return this.elements().block();
  }

  /* Registers */

  get pc(): number {
    return this[INNER_VM].pc;
  }

  public s0: any = null;
  public s1: any = null;
  public t0: any = null;
  public t1: any = null;
  public v0: any = null;

  // Fetch a value from a register onto the stack
  fetch(register: Register) {
    this.stack.push(this[Register[register]]);
  }

  // Load a value from the stack into a register
  load(register: Register) {
    this[Register[register]] = this.stack.pop();
  }

  // Fetch a value from a register
  fetchValue(register: Register.ra | Register.pc): number;
  fetchValue<T>(register: Register): T;
  fetchValue(register: Register): unknown {
    switch (register) {
      case Register.pc:
      case Register.ra:
        return this[INNER_VM].fetchRegister(register);
      case Register.sp:
        return this.stack.sp;
      case Register.fp:
        return this.stack.fp;
      default:
        return this[Register[register]];
    }
  }

  // Load a value into a register
  loadValue<T>(register: Register, value: T) {
    this[Register[register]] = value;
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
    let scope = Scope.root(self, scopeSize);
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
        scope: Scope.root(UNDEFINED_REFERENCE, 0),
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
    let evalStack = EvaluationStack.restore(stack);

    this[HEAP] = this.program.heap;
    this[CONSTANTS] = this.program.constants;
    this.elementStack = elementStack;
    this.stacks.scope.push(scope);
    this.stacks.dynamicScope.push(dynamicScope);
    this[ARGS] = new Arguments();
    this[INNER_VM] = new LowLevelVM(
      evalStack,
      this[HEAP],
      runtime.program,
      {
        debugBefore: (opcode: Opcode): DebugState => {
          return APPEND_OPCODES.debugBefore(this, opcode, opcode.type);
        },

        debugAfter: (opcode: Opcode, state: DebugState): void => {
          APPEND_OPCODES.debugAfter(this, opcode, opcode.type, state);
        },
      },
      pc
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

  capture(args: number, pc = this[INNER_VM].pc): VMState {
    return {
      pc,
      dynamicScope: this.dynamicScope(),
      scope: this.scope(),
      stack: this.stack.capture(args),
    };
  }

  beginCacheGroup() {
    this.stacks.cache.push(this.updating().tail());
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
    let marker = this.stacks.cache.pop();
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

    this.stacks.list.push(opcode);

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
    this.stacks.list.pop();
  }

  pushUpdating(list = new LinkedList<UpdatingOpcode>()): void {
    this.stacks.updating.push(list);
  }

  popUpdating(): LinkedList<UpdatingOpcode> {
    return expect(this.stacks.updating.pop(), "can't pop an empty stack");
  }

  updateWith(opcode: UpdatingOpcode) {
    this.updating().append(opcode);
  }

  listBlock(): ListBlockOpcode {
    return expect(this.stacks.list.current, 'expected a list block');
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
    return this.stacks.updating.current;
  }

  updating(): LinkedList<UpdatingOpcode> {
    return expect(
      this.stacks.updating.current,
      'expected updating opcode on the updating opcode stack'
    );
  }

  elements(): ElementBuilder {
    return this.elementStack;
  }

  scope(): Scope {
    return expect(this.stacks.scope.current, 'expected scope on the scope stack');
  }

  dynamicScope(): DynamicScope {
    return expect(
      this.stacks.dynamicScope.current,
      'expected dynamic scope on the dynamic scope stack'
    );
  }

  pushChildScope() {
    this.stacks.scope.push(this.scope().child());
  }

  pushDynamicScope(): DynamicScope {
    let child = this.dynamicScope().child();
    this.stacks.dynamicScope.push(child);
    return child;
  }

  pushRootScope(size: number, bindCaller: boolean): Scope {
    let scope = Scope.sized(size);
    if (bindCaller) scope.bindCallerScope(this.scope());
    this.stacks.scope.push(scope);
    return scope;
  }

  pushScope(scope: Scope) {
    this.stacks.scope.push(scope);
  }

  popScope() {
    this.stacks.scope.pop();
  }

  popDynamicScope() {
    this.stacks.dynamicScope.pop();
  }

  /// SCOPE HELPERS

  getSelf(): PathReference<any> {
    return this.scope().getSelf();
  }

  referenceForSymbol(symbol: number): PathReference<any> {
    return this.scope().getSymbol(symbol);
  }

  /// EXECUTION

  execute(initialize?: (vm: VM<T>) => void): RenderResult {
    if (DEBUG) {
      console.log(`EXECUTING FROM ${this[INNER_VM].pc}`);
    }

    if (initialize) initialize(this);

    let result: IteratorResult<RenderResult>;

    while (true) {
      result = this.next();
      if (result.done) break;
    }

    return result.value;
  }

  next(): IteratorResult<RenderResult> {
    let { env, elementStack } = this;
    let opcode = this[INNER_VM].nextStatement();
    let result: IteratorResult<RenderResult>;
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
