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
  assert,
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
import { LabelOpcode, JumpIfNotModifiedOpcode, DidModifyOpcode } from '../compiled/opcodes/vm';
import LowLevelVM, { Program } from './low-level';
import { VMState, ListBlockOpcode, TryOpcode, BlockOpcode, Runtime } from './update';
import RenderResult from './render-result';
import EvaluationStack from './stack';
import { Arguments } from './arguments';

import { APPEND_OPCODES, UpdatingOpcode, DebugState } from '../opcodes';

import { UNDEFINED_REFERENCE } from '../references';

import { Heap, Opcode } from '@glimmer/program';
import { RuntimeResolver } from '@glimmer/interfaces';
import { DEBUG } from '@glimmer/local-debug-flags';

export interface PublicVM {
  env: Environment;
  dynamicScope(): DynamicScope;
  getSelf(): PathReference<Opaque>;
  associateDestroyable(child: SymbolDestroyable | Destroyable): void;
}

export type IteratorResult<T> =
  | {
      done: false;
      value: null;
    }
  | {
      done: true;
      value: T;
    };

export interface Constants<T> {
  resolver: RuntimeResolver<T>;
  getNumber(value: number): number;
  getString(handle: number): string;
  getStringArray(value: number): string[];
  getArray(value: number): number[];
  resolveHandle<T>(index: number): T;
  getSerializable<T>(s: number): T;
}

export interface RuntimeProgram<T> extends Program {
  heap: Heap;
  constants: Constants<T>;
}

export default class VM<T> implements PublicVM {
  private readonly dynamicScopeStack = new Stack<DynamicScope>();
  private readonly scopeStack = new Stack<Scope>();
  readonly inner: LowLevelVM;
  readonly updatingOpcodeStack = new Stack<LinkedList<UpdatingOpcode>>();
  readonly destructorStack = new Stack<object>();
  readonly cacheGroups = new Stack<Option<UpdatingOpcode>>();
  readonly listBlockStack = new Stack<ListBlockOpcode>();
  readonly constants: Constants<T>;
  readonly heap: Heap;
  readonly args: Arguments;
  readonly destructor: object;

  get stack(): EvaluationStack {
    return this.inner.stack as EvaluationStack;
  }

  set stack(value: EvaluationStack) {
    this.inner.stack = value;
  }

  currentBlock(): LiveBlock {
    return this.elements().block();
  }

  /* Registers */

  set currentOpSize(value: number) {
    this.inner.currentOpSize = value;
  }

  get currentOpSize(): number {
    return this.inner.currentOpSize;
  }

  get pc(): number {
    return this.inner.pc;
  }

  set pc(value: number) {
    assert(typeof value === 'number' && value >= -1, `invalid pc: ${value}`);
    this.inner.pc = value;
  }

  get ra(): number {
    return this.inner.ra;
  }

  set ra(value: number) {
    this.inner.ra = value;
  }

  get fp(): number {
    return this.stack.fp;
  }

  set fp(fp: number) {
    this.stack.fp = fp;
  }

  get sp(): number {
    return this.stack.sp;
  }

  set sp(sp: number) {
    this.stack.sp = sp;
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
  fetchValue<T>(register: Register): T {
    return this[Register[register]];
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
    this.inner.pushFrame();
  }

  // Restore $ra, $sp and $fp
  popFrame() {
    this.inner.popFrame();
  }

  // Jump to an address in `program`
  goto(offset: number) {
    this.inner.goto(offset);
  }

  // Save $pc into $ra, then jump to a new address in `program` (jal in MIPS)
  call(handle: number) {
    this.inner.call(handle);
  }

  // Put a specific `program` address in $ra
  returnTo(offset: number) {
    this.inner.returnTo(offset);
  }

  // Return to the `program` address stored in $ra
  return() {
    this.inner.return();
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
    let vm = new VM({ program, env }, scope, dynamicScope, elementStack);
    vm.pc = vm.heap.getaddr(handle);
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
      Scope.root(UNDEFINED_REFERENCE, 0),
      dynamicScope,
      elementStack
    );
    vm.pushUpdating();
    vm.pc = vm.heap.getaddr(handle);
    return vm;
  }

  static resume({ scope, dynamicScope }: VMState, runtime: Runtime, stack: ElementBuilder) {
    return new VM(runtime, scope, dynamicScope, stack);
  }

  constructor(
    private runtime: Runtime,
    scope: Scope,
    dynamicScope: DynamicScope,
    private elementStack: ElementBuilder
  ) {
    this.heap = this.program.heap;
    this.constants = this.program.constants;
    this.elementStack = elementStack;
    this.scopeStack.push(scope);
    this.dynamicScopeStack.push(dynamicScope);
    this.args = new Arguments();
    this.inner = new LowLevelVM(EvaluationStack.empty(), this.heap, runtime.program, {
      debugBefore: (opcode: Opcode): DebugState => {
        return APPEND_OPCODES.debugBefore(this, opcode, opcode.type);
      },

      debugAfter: (opcode: Opcode, state: DebugState): void => {
        APPEND_OPCODES.debugAfter(this, opcode, opcode.type, state);
      },
    });

    this.destructor = {};
    this.destructorStack.push(this.destructor);
  }

  get program(): RuntimeProgram<Opaque> {
    return this.runtime.program;
  }

  get env(): Environment {
    return this.runtime.env;
  }

  capture(args: number): VMState {
    return {
      dynamicScope: this.dynamicScope(),
      scope: this.scope(),
      stack: this.stack.capture(args),
    };
  }

  beginCacheGroup() {
    this.cacheGroups.push(this.updating().tail());
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
    let marker = this.cacheGroups.pop();
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

    let tryOpcode = new TryOpcode(
      this.heap.gethandle(this.pc),
      state,
      this.runtime,
      block,
      updating
    );

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

    return new TryOpcode(
      this.heap.gethandle(this.pc),
      state,
      this.runtime,
      block,
      new LinkedList<UpdatingOpcode>()
    );
  }

  enterItem(key: string, opcode: TryOpcode) {
    this.listBlock().map[key] = opcode;
    this.didEnter(opcode);
  }

  enterList(relativeStart: number) {
    let updating = new LinkedList<BlockOpcode>();

    let state = this.capture(0);
    let list = this.elements().pushBlockList(updating);
    let artifacts = this.stack.peek<ReferenceIterator>().artifacts;

    let addr = this.pc + relativeStart - this.currentOpSize;
    let start = this.heap.gethandle(addr);

    let opcode = new ListBlockOpcode(start, state, this.runtime, list, updating, artifacts);

    this.listBlockStack.push(opcode);

    this.didEnter(opcode);
  }

  private didEnter(opcode: BlockOpcode) {
    this.associateDestructor(destructor(opcode));
    this.destructorStack.push(opcode);
    this.updateWith(opcode);
    this.pushUpdating(opcode.children);
  }

  exit() {
    this.destructorStack.pop();
    this.elements().popBlock();
    this.popUpdating();

    let parent = this.updating().tail() as BlockOpcode;

    parent.didInitializeChildren();
  }

  exitList() {
    this.exit();
    this.listBlockStack.pop();
  }

  pushUpdating(list = new LinkedList<UpdatingOpcode>()): void {
    this.updatingOpcodeStack.push(list);
  }

  popUpdating(): LinkedList<UpdatingOpcode> {
    return expect(this.updatingOpcodeStack.pop(), "can't pop an empty stack");
  }

  updateWith(opcode: UpdatingOpcode) {
    this.updating().append(opcode);
  }

  listBlock(): ListBlockOpcode {
    return expect(this.listBlockStack.current, 'expected a list block');
  }

  associateDestructor(child: Drop): void {
    if (!isDrop(child)) return;
    let parent = expect(this.destructorStack.current, 'Expected destructor parent');
    associateDestructor(parent, child);
  }

  associateDestroyable(child: SymbolDestroyable | Destroyable): void {
    this.associateDestructor(destructor(child));
  }

  tryUpdating(): Option<LinkedList<UpdatingOpcode>> {
    return this.updatingOpcodeStack.current;
  }

  updating(): LinkedList<UpdatingOpcode> {
    return expect(
      this.updatingOpcodeStack.current,
      'expected updating opcode on the updating opcode stack'
    );
  }

  elements(): ElementBuilder {
    return this.elementStack;
  }

  scope(): Scope {
    return expect(this.scopeStack.current, 'expected scope on the scope stack');
  }

  dynamicScope(): DynamicScope {
    return expect(
      this.dynamicScopeStack.current,
      'expected dynamic scope on the dynamic scope stack'
    );
  }

  pushChildScope() {
    this.scopeStack.push(this.scope().child());
  }

  pushDynamicScope(): DynamicScope {
    let child = this.dynamicScope().child();
    this.dynamicScopeStack.push(child);
    return child;
  }

  pushRootScope(size: number, bindCaller: boolean): Scope {
    let scope = Scope.sized(size);
    if (bindCaller) scope.bindCallerScope(this.scope());
    this.scopeStack.push(scope);
    return scope;
  }

  pushScope(scope: Scope) {
    this.scopeStack.push(scope);
  }

  popScope() {
    this.scopeStack.pop();
  }

  popDynamicScope() {
    this.dynamicScopeStack.pop();
  }

  /// SCOPE HELPERS

  getSelf(): PathReference<any> {
    return this.scope().getSelf();
  }

  referenceForSymbol(symbol: number): PathReference<any> {
    return this.scope().getSymbol(symbol);
  }

  /// EXECUTION

  execute(start: number, initialize?: (vm: VM<T>) => void): RenderResult {
    if (DEBUG) {
      console.log(`EXECUTING FROM ${start}`);
    }

    this.pc = this.heap.getaddr(start);

    if (initialize) initialize(this);

    let result: IteratorResult<RenderResult>;

    while (true) {
      result = this.next();
      if (result.done) break;
    }

    return result.value;
  }

  next(): IteratorResult<RenderResult> {
    let { env, program, elementStack } = this;
    let opcode = this.inner.nextStatement();
    let result: IteratorResult<RenderResult>;
    if (opcode !== null) {
      this.inner.evaluateOuter(opcode, this);
      result = { done: false, value: null };
    } else {
      // Unload the stack
      this.stack.reset();

      result = {
        done: true,
        value: new RenderResult(
          env,
          program,
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
      let name = this.constants.getString(names[i]);
      scope.set(name, this.stack.pop<VersionedPathReference<Opaque>>());
    }
  }
}
