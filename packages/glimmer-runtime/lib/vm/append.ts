import { Scope, DynamicScope, Environment } from '../environment';
import { ElementStack } from '../builder';
import { Option, Destroyable, Stack, LinkedList, ListSlice, LOGGER, Opaque, assert, expect } from 'glimmer-util';
import { PathReference, combineSlice } from 'glimmer-reference';
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
  AppendOpcode,
  Slice,
  UpdatingOpcode,
  Constants,
  ConstantString,
  ConstantSlice,
} from '../opcodes';

export interface PublicVM {
  env: Environment;
  getArgs(): Option<EvaluatedArgs>;
  dynamicScope(): DynamicScope;
  getSelf(): PathReference<Opaque>;
  newDestroyable(d: Destroyable): void;
}

export default class VM implements PublicVM {
  private dynamicScopeStack = new Stack<DynamicScope>();
  private scopeStack = new Stack<Scope>();
  public updatingOpcodeStack = new Stack<LinkedList<UpdatingOpcode>>();
  public cacheGroups = new Stack<Option<UpdatingOpcode>>();
  public listBlockStack = new Stack<ListBlockOpcode>();
  public frame = new FrameStack();
  public constants: Constants;

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
    // assert(this.frame.getOps().contains(op), `Illegal jump to ${op.label}`);
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

  enter(sliceId: ConstantSlice) {
    let updating = new LinkedList<UpdatingOpcode>();

    let tracker = this.stack().pushUpdatableBlock();
    let state = this.capture();

    let slice = this.constants.getSlice(sliceId);
    let tryOpcode = new TryOpcode(slice, state, tracker, updating);

    this.didEnter(tryOpcode, updating);
  }

  enterWithKey(key: string, ops: Slice) {
    let updating = new LinkedList<UpdatingOpcode>();

    let tracker = this.stack().pushUpdatableBlock();
    let state = this.capture();

    let tryOpcode = new TryOpcode(ops, state, tracker, updating);

    this.listBlock().map[key] = tryOpcode;

    this.didEnter(tryOpcode, updating);
  }

  enterList(ops: Slice) {
    let updating = new LinkedList<BlockOpcode>();

    let tracker = this.stack().pushBlockList(updating);
    let state = this.capture();
    let artifacts = this.frame.getIterator().artifacts;

    let opcode = new ListBlockOpcode(ops, state, tracker, updating, artifacts);

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
    let ops = block.ops;
    this.frame.push({ ops, start: 0, end: ops.length - 1 });

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
    let slice = { ops: layout.ops, start: 0, end: layout.ops.length - 1 };
    this.frame.push(slice, component, manager, shadow);

    if (args) this.frame.setArgs(args);
    if (args && args.blocks) this.frame.setBlocks(args.blocks);
    if (callerScope) this.frame.setCallerScope(callerScope);
  }

  pushEvalFrame(ops: AppendOpcode[]) {
    this.frame.push({ ops, start: 0, end: ops.length - 1 });
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

  resume(opcodes: Slice, frame: CapturedFrame): RenderResult {
    return this.execute(opcodes, vm => vm.frame.restore(frame));
  }

  execute(opcodes: Slice, initialize?: (vm: VM) => void): RenderResult {
    LOGGER.debug("[VM] Begin program execution");

    let { elementStack, frame, updatingOpcodeStack, env } = this;

    elementStack.pushSimpleBlock();

    updatingOpcodeStack.push(new LinkedList<UpdatingOpcode>());
    frame.push(opcodes);

    if (initialize) initialize(this);

    let opcode: Option<AppendOpcode>;

    while (frame.hasOpcodes()) {
      if (opcode = frame.nextStatement()) {
        LOGGER.trace(opcode);
        APPEND_OPCODES.evaluate(this, opcode);
      }
    }

    LOGGER.debug("[VM] Completed program execution");

    return new RenderResult(
      env,
      expect(updatingOpcodeStack.pop(), 'there should be a final updating opcode stack'),
      elementStack.popBlock()
    );
  }

  evaluateOpcode(opcode: AppendOpcode) {
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
