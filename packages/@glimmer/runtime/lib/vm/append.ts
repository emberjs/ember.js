import { Scope, DynamicScope, Environment, Opcode } from '../environment';
import { ElementStack } from '../builder';
import { Option, Destroyable, Stack, LinkedList, ListSlice, Opaque, assert, expect } from '@glimmer/util';
import { PathReference, combineSlice } from '@glimmer/reference';
import { CompiledBlock } from '../compiled/blocks';
import { InlineBlock, PartialBlock } from '../scanner';
import { CompiledExpression } from '../compiled/expressions';
import { CompiledArgs, EvaluatedArgs } from '../compiled/expressions/args';
import { LabelOpcode, JumpIfNotModifiedOpcode, DidModifyOpcode } from '../compiled/opcodes/vm';
import { Component, ComponentManager } from '../component/interfaces';
import { VMState, ListBlockOpcode, TryOpcode, BlockOpcode } from './update';
import RenderResult from './render-result';
import { CapturedFrame, FrameStack } from './frame';

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

export interface IteratorResult<T> {
  value: T | null;
  done: boolean;
}

export default class VM implements PublicVM {
  private dynamicScopeStack = new Stack<DynamicScope>();
  private scopeStack = new Stack<Scope>();
  public updatingOpcodeStack = new Stack<LinkedList<UpdatingOpcode>>();
  public cacheGroups = new Stack<Option<UpdatingOpcode>>();
  public listBlockStack = new Stack<ListBlockOpcode>();
  public frame = new FrameStack();
  public constants: Constants;
  private notDone = { done: false, value: null };

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
      frame: this.frame.capture()
    };
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

    let tracker = this.stack().pushUpdatableBlock();
    let state = this.capture();

    let tryOpcode = new TryOpcode(start, end, state, tracker, updating);

    this.didEnter(tryOpcode, updating);
  }

  enterWithKey(key: string, start: number, end: number) {
    let updating = new LinkedList<UpdatingOpcode>();

    let tracker = this.stack().pushUpdatableBlock();
    let state = this.capture();

    let tryOpcode = new TryOpcode(start, end, state, tracker, updating);

    this.listBlock().map[key] = tryOpcode;

    this.didEnter(tryOpcode, updating);
  }

  enterList(start: number, end: number) {
    let updating = new LinkedList<BlockOpcode>();

    let tracker = this.stack().pushBlockList(updating);
    let state = this.capture();
    let artifacts = this.frame.getIterator().artifacts;

    let opcode = new ListBlockOpcode(start, end, state, tracker, updating, artifacts);

    this.listBlockStack.push(opcode);

    this.didEnter(opcode, updating);
  }

  private didEnter(opcode: BlockOpcode, updating: LinkedList<UpdatingOpcode>) {
    this.updateWith(opcode);
    this.updatingOpcodeStack.push(updating);
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

  pushFrame(
    block: CompiledBlock,
    args?: Option<EvaluatedArgs>,
    callerScope?: Scope
  ) {
    this.frame.push(block.start, block.end);

    if (args) this.frame.setArgs(args);
    if (args && args.blocks) this.frame.setBlocks(args.blocks);
    if (callerScope) this.frame.setCallerScope(callerScope);
  }

  pushComponentFrame(
    layout: CompiledBlock,
    args: EvaluatedArgs,
    callerScope: Scope,
    component: Component,
    manager: ComponentManager<Component>,
    shadow: Option<InlineBlock>
  ) {
    this.frame.push(layout.start, layout.end, component, manager, shadow);

    if (args) this.frame.setArgs(args);
    if (args && args.blocks) this.frame.setBlocks(args.blocks);
    if (callerScope) this.frame.setCallerScope(callerScope);
  }

  pushEvalFrame(start: number, end: number) {
    this.frame.push(start, end);
  }

  pushChildScope() {
    this.scopeStack.push(this.scope().child());
  }

  pushCallerScope() {
    this.scopeStack.push(expect(this.scope().getCallerScope(), 'pushCallerScope is called when a caller scope is present'));
  }

  pushDynamicScope(): DynamicScope {
    let child = this.dynamicScope().child();
    this.dynamicScopeStack.push(child);
    return child;
  }

  pushRootScope(self: PathReference<any>, size: number): Scope {
    let scope = Scope.root(self, size);
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
    return this.frame.getArgs();
  }

  /// EXECUTION

  resume(start: number, end: number, frame: CapturedFrame): RenderResult {
    return this.execute(start, end, vm => vm.frame.restore(frame));
  }

  execute(start: number, end: number, initialize?: (vm: VM) => void): RenderResult {
    this.prepare(start, end, initialize);
    let result: IteratorResult<RenderResult>;

    while (true) {
      result = this.next();
      if (result.done) break;
    }

    return result.value as RenderResult;
  }

  prepare(start: number, end: number, initialize?: (vm: VM) => void): void {
    let { elementStack, frame, updatingOpcodeStack } = this;

    elementStack.pushSimpleBlock();

    updatingOpcodeStack.push(new LinkedList<UpdatingOpcode>());

    frame.push(start, end);

    if (initialize) initialize(this);
  }

  next(): IteratorResult<RenderResult> {
    let { frame, env, updatingOpcodeStack, elementStack } = this;
    let opcode: Option<Opcode>;

    if (opcode = frame.nextStatement(env)) {
      APPEND_OPCODES.evaluate(this, opcode);
      return this.notDone;
    }

    return {
      done: true,
      value: new RenderResult(
        env,
        expect(updatingOpcodeStack.pop(), 'there should be a final updating opcode stack'),
        elementStack.popBlock()
      )
    };
  }

  evaluateOpcode(opcode: Opcode) {
    APPEND_OPCODES.evaluate(this, opcode);
  }

  // Make sure you have opcodes that push and pop a scope around this opcode
  // if you need to change the scope.
  invokeBlock(block: InlineBlock, args: Option<EvaluatedArgs>) {
    let compiled = block.compile(this.env);
    this.pushFrame(compiled, args);
  }

  invokePartial(block: PartialBlock) {
    let compiled = block.compile(this.env);
    this.pushFrame(compiled);
  }

  invokeLayout(
    args: EvaluatedArgs,
    layout: CompiledBlock,
    callerScope: Scope,
    component: Component,
    manager: ComponentManager<Component>,
    shadow: Option<InlineBlock>
  ) {
    this.pushComponentFrame(layout, args, callerScope, component, manager, shadow);
  }

  evaluateOperand(expr: CompiledExpression<any>) {
    this.frame.setOperand(expr.evaluate(this));
  }

  evaluateArgs(args: CompiledArgs) {
    let evaledArgs = this.frame.setArgs(args.evaluate(this));
    this.frame.setOperand(evaledArgs.positional.at(0));
  }

  bindPositionalArgs(symbols: number[]) {
    let args = expect(this.frame.getArgs(), 'bindPositionalArgs assumes a previous setArgs');

    let { positional } = args;

    let scope = this.scope();

    for(let i=0; i < symbols.length; i++) {
      scope.bindSymbol(symbols[i], positional.at(i));
    }
  }

  bindNamedArgs(names: ConstantString[], symbols: number[]) {
    let args = expect(this.frame.getArgs(), 'bindNamedArgs assumes a previous setArgs');
    let scope = this.scope();

    let { named } = args;

    for(let i=0; i < names.length; i++) {
      let name = this.constants.getString(names[i]);
      scope.bindSymbol(symbols[i], named.get(name));
    }
  }

  bindBlocks(names: ConstantString[], symbols: number[]) {
    let blocks = this.frame.getBlocks();
    let scope = this.scope();

    for(let i=0; i < names.length; i++) {
      let name = this.constants.getString(names[i]);
      scope.bindBlock(symbols[i], (blocks && blocks[name]) || null);
    }
  }

  bindPartialArgs(symbol: number) {
    let args = expect(this.frame.getArgs(), 'bindPartialArgs assumes a previous setArgs');
    let scope = this.scope();

    assert(args, "Cannot bind named args");

    scope.bindPartialArgs(symbol, args);
  }

  bindCallerScope() {
    let callerScope = this.frame.getCallerScope();
    let scope = this.scope();

    assert(callerScope, "Cannot bind caller scope");

    scope.bindCallerScope(callerScope);
  }

  bindDynamicScope(names: ConstantString[]) {
    let args = expect(this.frame.getArgs(), 'bindDynamicScope assumes a previous setArgs');
    let scope = this.dynamicScope();

    assert(args, "Cannot bind dynamic scope");

    for(let i=0; i < names.length; i++) {
      let name = this.constants.getString(names[i]);
      scope.set(name, args.named.get(name));
    }
  }
}
