import { ICapturedArguments } from './arguments';
import { Register } from '@glimmer/vm';
import { Scope, DynamicScope, Environment } from '../environment';
import { ElementBuilder } from './element-builder';
import { Option, Destroyable, Stack, LinkedList, ListSlice, Opaque, expect, assert } from '@glimmer/util';
import { ReferenceIterator, PathReference, VersionedPathReference, combineSlice } from '@glimmer/reference';
import { LabelOpcode, JumpIfNotModifiedOpcode, DidModifyOpcode } from '../compiled/opcodes/vm';
import { VMState, ListBlockOpcode, TryOpcode, BlockOpcode } from './update';
import RenderResult from './render-result';
import EvaluationStack from './stack';

import {
  APPEND_OPCODES,
  UpdatingOpcode
} from '../opcodes';

import {
  UNDEFINED_REFERENCE
} from '../references';

import { Opcode, VMHandle } from "@glimmer/interfaces";
import { Heap, RuntimeProgram as Program, RuntimeConstants, RuntimeProgram } from "@glimmer/program";

export interface PublicVM {
  env: Environment;
  dynamicScope(): DynamicScope;
  getSelf(): PathReference<Opaque>;
  newDestroyable(d: Destroyable): void;
}

export type IteratorResult<T> = {
  done: false;
  value: null;
} | {
  done: true;
  value: T;
};

export default class VM<TemplateMeta> implements PublicVM {
  private dynamicScopeStack = new Stack<DynamicScope>();
  private scopeStack = new Stack<Scope>();
  public updatingOpcodeStack = new Stack<LinkedList<UpdatingOpcode>>();
  public cacheGroups = new Stack<Option<UpdatingOpcode>>();
  public listBlockStack = new Stack<ListBlockOpcode>();
  public constants: RuntimeConstants<TemplateMeta>;
  public heap: Heap;

  public stack = EvaluationStack.empty();

  /* Registers */

  private _pc = -1;
  private _ra = -1;

  private currentOpSize = 0;

  get pc(): number {
    return this._pc;
  }

  set pc(value: number) {
    assert(typeof value === 'number' && value >= -1, `invalid pc: ${value}`);
    this._pc = value;
  }

  private set ra(value: number) {
    assert(typeof value === 'number' && value >= -1, `invalid ra: ${value}`);
    this._ra = value;
  }

  private get ra(): number {
    return this._ra;
  }

  private get fp(): number {
    return this.stack.fp;
  }

  private set fp(fp: number) {
    this.stack.fp = fp;
  }

  private get sp(): number {
    return this.stack.sp;
  }

  private set sp(sp: number) {
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

  // Start a new frame and save $ra and $fp on the stack
  pushFrame() {
    this.stack.push(this.ra);
    this.stack.push(this.fp);
    this.fp = this.sp - 1;
  }

  // Restore $ra, $sp and $fp
  popFrame() {
    this.sp = this.fp - 1;
    this.ra = this.stack.get<number>(0);
    this.fp = this.stack.get<number>(1);
  }

  // Jump to an address in `program`
  goto(offset: number) {
    let addr = (this.pc + offset) - this.currentOpSize;
    this.pc = addr;
  }

  // Save $pc into $ra, then jump to a new address in `program` (jal in MIPS)
  call(handle: VMHandle) {
    this.ra = this.pc;
    this.pc = this.heap.getaddr(handle);
  }

  // Put a specific `program` address in $ra
  returnTo(offset: number) {
    let addr = (this.pc + offset) - this.currentOpSize;
    this.ra = addr;
  }

  // Return to the `program` address stored in $ra
  return() {
    this.pc = this.ra;
  }

  static initial<TemplateMeta>(
    program: RuntimeProgram<TemplateMeta>,
    env: Environment,
    self: PathReference<Opaque>,
    args: Option<ICapturedArguments>,
    dynamicScope: DynamicScope,
    elementStack: ElementBuilder,
    handle: VMHandle
  ) {
    let scopeSize = program.heap.scopesizeof(handle);
    let scope = Scope.root(self, scopeSize);

    if (args) {

    }

    let vm = new VM(program, env, scope, dynamicScope, elementStack);
    vm.pc = vm.heap.getaddr(handle);
    vm.updatingOpcodeStack.push(new LinkedList<UpdatingOpcode>());
    return vm;
  }

  static empty<TemplateMeta>(
    program: RuntimeProgram<TemplateMeta>,
    env: Environment,
    elementStack: ElementBuilder
  ) {
    let dynamicScope: DynamicScope = {
      get() { return UNDEFINED_REFERENCE; },
      set() { return UNDEFINED_REFERENCE; },
      child() { return dynamicScope; }
    };

    let vm = new VM(program, env, Scope.root(UNDEFINED_REFERENCE, 0), dynamicScope, elementStack);
    vm.updatingOpcodeStack.push(new LinkedList<UpdatingOpcode>());
    return vm;
  }

  static resume({ program, env, scope, dynamicScope }: VMState, stack: ElementBuilder) {
    return new VM(program, env, scope, dynamicScope, stack);
  }

  constructor(
    private program: Program<TemplateMeta>,
    public env: Environment,
    scope: Scope,
    dynamicScope: DynamicScope,
    private elementStack: ElementBuilder,
  ) {
    this.env = env;
    this.heap = program.heap;
    this.constants = program.constants;
    this.elementStack = elementStack;
    this.scopeStack.push(scope);
    this.dynamicScopeStack.push(dynamicScope);
  }

  capture(args: number): VMState {
    return {
      env: this.env,
      program: this.program,
      dynamicScope: this.dynamicScope(),
      scope: this.scope(),
      stack: this.stack.capture(args)
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

    let END = new LabelOpcode("END");

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
    let tracker = this.elements().pushUpdatableBlock();

    let tryOpcode = new TryOpcode(this.heap.gethandle(this.pc), state, tracker, updating);

    this.didEnter(tryOpcode);
  }

  iterate(memo: VersionedPathReference<Opaque>, value: VersionedPathReference<Opaque>): TryOpcode {
    let stack = this.stack;
    stack.push(value);
    stack.push(memo);

    let state = this.capture(2);
    let tracker = this.elements().pushUpdatableBlock();

    // let ip = this.ip;
    // this.ip = end + 4;
    // this.frames.push(ip);

    return new TryOpcode(this.heap.gethandle(this.pc), state, tracker, new LinkedList<UpdatingOpcode>());
  }

  enterItem(key: string, opcode: TryOpcode) {
    this.listBlock().map[key] = opcode;
    this.didEnter(opcode);
  }

  enterList(relativeStart: number) {
    let updating = new LinkedList<BlockOpcode>();

    let state = this.capture(0);
    let tracker = this.elements().pushBlockList(updating);
    let artifacts = this.stack.peek<ReferenceIterator>().artifacts;

    let addr = (this.pc + relativeStart) - this.currentOpSize;
    let start = this.heap.gethandle(addr);

    let opcode = new ListBlockOpcode(start, state, tracker, updating, artifacts);

    this.listBlockStack.push(opcode);

    this.didEnter(opcode);
  }

  private didEnter(opcode: BlockOpcode) {
    this.updateWith(opcode);
    this.updatingOpcodeStack.push(opcode.children);
  }

  exit() {
    this.elements().popBlock();
    this.updatingOpcodeStack.pop();

    let parent = this.updating().tail() as BlockOpcode;

    parent.didInitializeChildren();
  }

  exitList() {
    this.exit();
    this.listBlockStack.pop();
  }

  updateWith(opcode: UpdatingOpcode) {
    this.updating().append(opcode);
  }

  listBlock(): ListBlockOpcode {
    return expect(this.listBlockStack.current, 'expected a list block');
  }

  updating(): LinkedList<UpdatingOpcode> {
    return expect(this.updatingOpcodeStack.current, 'expected updating opcode on the updating opcode stack');
  }

  elements(): ElementBuilder {
    return this.elementStack;
  }

  scope(): Scope {
    return expect(this.scopeStack.current, 'expected scope on the scope stack');
  }

  dynamicScope(): DynamicScope {
    return expect(this.dynamicScopeStack.current, 'expected dynamic scope on the dynamic scope stack');
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

  newDestroyable(d: Destroyable) {
    this.elements().didAddDestroyable(d);
  }

  /// SCOPE HELPERS

  getSelf(): PathReference<any> {
    return this.scope().getSelf();
  }

  referenceForSymbol(symbol: number): PathReference<any> {
    return this.scope().getSymbol(symbol);
  }

  /// EXECUTION

  execute(start: VMHandle, initialize?: (vm: VM<TemplateMeta>) => void): RenderResult {
    this.pc = this.heap.getaddr(start);

    if (initialize) initialize(this);

    let result: IteratorResult<RenderResult>;

    while (true) {
      result = this.next();
      if (result.done) break;
    }

    return result.value as RenderResult;
  }

  next(): IteratorResult<RenderResult> {
    let { env, program, updatingOpcodeStack, elementStack } = this;
    let opcode = this.nextStatement();
    let result: IteratorResult<RenderResult>;
    if (opcode !== null) {
      APPEND_OPCODES.evaluate(this, opcode, opcode.type);
      result = { done: false, value: null };
    } else {
      // Unload the stack
      this.stack.reset();

      result = {
        done: true,
        value: new RenderResult(
          env,
          program,
          expect(updatingOpcodeStack.pop(), 'there should be a final updating opcode stack'),
          elementStack.popBlock()
        )
      };
    }
    return result;
  }

  private nextStatement(): Option<Opcode> {
    let { pc, program } = this;

    if (pc === -1) {
      return null;
    }
    // We have to save off the current operations size so that
    // when we do a jump we can calculate the correct offset
    // to where we are going. We can't simply ask for the size
    // in a jump because we have have already incremented the
    // program counter to the next instruction prior to executing.
    let { size } = this.program.opcode(pc);
    let operationSize = this.currentOpSize = size;
    this.pc += operationSize;

    return program.opcode(pc);
  }

  bindDynamicScope(names: number[]) {
    let scope = this.dynamicScope();

    for(let i=names.length - 1; i>=0; i--) {
      let name = this.constants.getString(names[i]);
      scope.set(name, this.stack.pop<VersionedPathReference<Opaque>>());
    }
  }
}
