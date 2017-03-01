import { Scope, DynamicScope, Environment, Opcode } from '../environment';
import { ElementStack } from '../builder';
import { Option, Destroyable, Stack, LinkedList, ListSlice, Opaque, expect } from '@glimmer/util';
import { ReferenceIterator, PathReference, VersionedPathReference, combineSlice } from '@glimmer/reference';
import { OpSlice } from '../compiled/blocks';
import { Template } from '../scanner';
import { EvaluatedArgs } from '../compiled/expressions/args';
import { LabelOpcode, JumpIfNotModifiedOpcode, DidModifyOpcode } from '../compiled/opcodes/vm';
import { VMState, ListBlockOpcode, TryOpcode, BlockOpcode } from './update';
import RenderResult from './render-result';
import { FrameStack } from './frame';

import {
  APPEND_OPCODES,
  UpdatingOpcode,
  Constants,
  ConstantString,
} from '../opcodes';

export interface PublicVM {
  env: Environment;
  getArgs(): Option<EvaluatedArgs>;
  dynamicScope(): DynamicScope;
  getSelf(): PathReference<Opaque>;
  newDestroyable(d: Destroyable): void;
}

export class EvaluationStack {
  constructor(private stack: Opaque[] = []) {
    Object.seal(this);
  }

  get pos() {
    return this.stack.length;
  }

  snapshot(): EvaluationStack {
    return new EvaluationStack(this.stack.slice());
  }

  restore(bp: number): number {
    this.stack.length = bp;
    return this.pop<number>();
  }

  set(pos: number, value: Opaque) {
    this.stack[pos] = value;
  }

  get(pos: number): Opaque {
    return this.stack[pos];
  }

  push(value: Opaque) {
    this.stack.push(value);
  }

  pop<T>(): T {
    return this.stack.pop() as T;
  }

  top<T>(): T {
    return this.stack[this.stack.length - 1] as T;
  }

  fromTop<T>(pos: number): T {
    return this.stack[this.stack.length - 1 - pos] as T;
  }

  slice<T extends Opaque[]>(count: number): T {
    return this.stack.slice(this.stack.length - count) as T;
  }
}

export default class VM implements PublicVM {
  private dynamicScopeStack = new Stack<DynamicScope>();
  private scopeStack = new Stack<Scope>();
  private bp = 0;
  public updatingOpcodeStack = new Stack<LinkedList<UpdatingOpcode>>();
  public cacheGroups = new Stack<Option<UpdatingOpcode>>();
  public listBlockStack = new Stack<ListBlockOpcode>();
  public frame = new FrameStack();
  public constants: Constants;
  public evalStack = new EvaluationStack();

  static initial(
    env: Environment,
    self: PathReference<Opaque>,
    dynamicScope: DynamicScope,
    elementStack: ElementStack,
    size: number
  ) {
    let scope = Scope.root(self, size);
    return new VM(env, scope, dynamicScope, elementStack);
  }

  constructor(
    public env: Environment,
    scope: Scope,
    dynamicScope: DynamicScope,
    private elementStack: ElementStack,
  ) {
    this.env = env;
    this.constants = env.constants;
    this.elementStack = elementStack;
    this.scopeStack.push(scope);
    this.dynamicScopeStack.push(dynamicScope);
  }

  capture(): VMState {
    return {
      env: this.env,
      scope: this.scope(),
      dynamicScope: this.dynamicScope(),
      stack: this.evalStack.snapshot(),
      bp: this.bp
    };
  }

  reserveLocals(size: number) {
    let { evalStack: stack, bp } = this;

    stack.push(bp);
    this.bp = stack.pos;

    for (let i=0; i<size; i++) {
      stack.push(null);
    }
  }

  releaseLocals() {
    let { evalStack: stack, bp } = this;
    this.bp = stack.restore(bp);
  }

  setLocal(position: number, value: Opaque) {
    this.evalStack.set(this.bp + position, value);
  }

  getLocal<T>(position: number): T {
    return this.evalStack.get(this.bp + position) as T;
  }

  goto(ip: number) {
    this.frame.goto(ip);
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

  enter(start: number, end: number) {
    let updating = new LinkedList<UpdatingOpcode>();

    let state = this.capture();
    let tracker = this.stack().pushUpdatableBlock();

    let tryOpcode = new TryOpcode(start, end, state, tracker, updating);

    this.didEnter(tryOpcode);
  }

  iterate(start: number, end: number, memo: VersionedPathReference<Opaque>, value: VersionedPathReference<Opaque>, updating = new LinkedList<UpdatingOpcode>()): TryOpcode {
    let stack = this.evalStack;
    stack.push(value);
    stack.push(memo);

    let state = this.capture();
    let tracker = this.stack().pushUpdatableBlock();

    return new TryOpcode(start, end, state, tracker, updating);
  }

  enterItem(key: string, opcode: TryOpcode) {
    this.listBlock().map[key] = opcode;
    this.didEnter(opcode);
  }

  enterList(start: number, end: number) {
    let updating = new LinkedList<BlockOpcode>();

    let state = this.capture();
    let tracker = this.stack().pushBlockList(updating);
    let artifacts = this.evalStack.top<ReferenceIterator>().artifacts;

    let opcode = new ListBlockOpcode(start, end, state, tracker, updating, artifacts);

    this.listBlockStack.push(opcode);

    this.didEnter(opcode);
  }

  private didEnter(opcode: BlockOpcode) {
    this.updateWith(opcode);
    this.updatingOpcodeStack.push(opcode.children);
  }

  exit() {
    this.stack().popBlock();
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

  stack(): ElementStack {
    return this.elementStack;
  }

  scope(): Scope {
    return expect(this.scopeStack.current, 'expected scope on the scope stack');
  }

  dynamicScope(): DynamicScope {
    return expect(this.dynamicScopeStack.current, 'expected dynamic scope on the dynamic scope stack');
  }

  pushFrame(block: OpSlice) {
    this.frame.push(block.start, block.end);
  }

  pushEvalFrame(start: number, end: number) {
    this.frame.push(start, end);
  }

  pushChildScope() {
    this.scopeStack.push(this.scope().child());
  }

  pushCallerScope(childScope = false) {
    let callerScope = expect(this.scope().getCallerScope(), 'pushCallerScope is called when a caller scope is present');
    this.scopeStack.push(childScope ? callerScope.child() : callerScope);
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

  popScope() {
    this.scopeStack.pop();
  }

  popDynamicScope() {
    this.dynamicScopeStack.pop();
  }

  newDestroyable(d: Destroyable) {
    this.stack().newDestroyable(d);
  }

  /// SCOPE HELPERS

  getSelf(): PathReference<any> {
    return this.scope().getSelf();
  }

  referenceForSymbol(symbol: number): PathReference<any> {
    return this.scope().getSymbol(symbol);
  }

  getArgs(): Option<EvaluatedArgs> {
    return this.evalStack.pop<Option<EvaluatedArgs>>();
  }

  /// EXECUTION

  resume(start: number, end: number, stack: EvaluationStack, bp: number): RenderResult {
    return this.execute(start, end, vm => {
      vm.evalStack = stack;
      vm.bp = bp;
    });
  }

  execute(start: number, end: number, initialize?: (vm: VM) => void): RenderResult {
    let { elementStack, frame, updatingOpcodeStack, env } = this;

    elementStack.pushSimpleBlock();

    updatingOpcodeStack.push(new LinkedList<UpdatingOpcode>());
    frame.push(start, end);

    if (initialize) initialize(this);

    let opcode: Option<Opcode>;

    while (frame.hasOpcodes()) {
      if (opcode = frame.nextStatement(this.env)) {
        APPEND_OPCODES.evaluate(this, opcode, opcode.type);
      }
    }

    return new RenderResult(
      env,
      expect(updatingOpcodeStack.pop(), 'there should be a final updating opcode stack'),
      elementStack.popBlock()
    );
  }

  evaluateOpcode(opcode: Opcode) {
    APPEND_OPCODES.evaluate(this, opcode, opcode.type);
  }

  invoke(compiled: OpSlice) {
    this.pushFrame(compiled);
  }

  // Make sure you have opcodes that push and pop a scope around this opcode
  // if you need to change the scope.
  invokeBlock(block: Template) {
    let compiled = block.compileStatic(this.env);
    this.invoke(compiled);
  }

  bindDynamicScope(names: ConstantString[]) {
    let scope = this.dynamicScope();

    for(let i=names.length - 1; i>=0; i--) {
      let name = this.constants.getString(names[i]);
      scope.set(name, this.evalStack.pop<VersionedPathReference<Opaque>>());
    }
  }
}
