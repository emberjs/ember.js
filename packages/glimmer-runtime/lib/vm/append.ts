import { Scope, DynamicScope, Environment } from '../environment';
import { ElementStack } from '../builder';
import { Destroyable, Stack, LinkedList, ListSlice, LOGGER, Opaque, assert } from 'glimmer-util';
import { PathReference, combineSlice } from 'glimmer-reference';
import { InlineBlock, PartialBlock, CompiledBlock } from '../compiled/blocks';
import { CompiledExpression } from '../compiled/expressions';
import { CompiledArgs, EvaluatedArgs } from '../compiled/expressions/args';
import { Opcode, OpSeq, UpdatingOpcode } from '../opcodes';
import { LabelOpcode, JumpIfNotModifiedOpcode, DidModifyOpcode } from '../compiled/opcodes/vm';
import { Range } from '../utils';
import { Component, ComponentManager } from '../component/interfaces';
import { VMState, ListBlockOpcode, TryOpcode, BlockOpcode } from './update';
import RenderResult from './render-result';
import { CapturedFrame, FrameStack } from './frame';

export interface PublicVM {
  env: Environment;
  getArgs(): EvaluatedArgs;
  dynamicScope(): DynamicScope;
  getSelf(): PathReference<Opaque>;
  newDestroyable(d: Destroyable);
}

type OpList = Range<Opcode>;

export default class VM implements PublicVM {
  private dynamicScopeStack = new Stack<DynamicScope>();
  private scopeStack = new Stack<Scope>();
  public updatingOpcodeStack = new Stack<LinkedList<UpdatingOpcode>>();
  public cacheGroups = new Stack<UpdatingOpcode>();
  public listBlockStack = new Stack<ListBlockOpcode>();
  public frame = new FrameStack();

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

  goto(op: LabelOpcode) {
    // assert(this.frame.getOps().contains(op), `Illegal jump to ${op.label}`);
    this.frame.goto(op);
  }

  beginCacheGroup() {
    this.cacheGroups.push(this.updatingOpcodeStack.current.tail());
  }

  commitCacheGroup() {
    //        JumpIfNotModified(END)
    //        (head)
    //        (....)
    //        (tail)
    //        DidModify
    // END:   Noop

    let END = new LabelOpcode("END");

    let opcodes = this.updatingOpcodeStack.current;
    let marker = this.cacheGroups.pop();
    let head = marker ? opcodes.nextNode(marker) : opcodes.head();
    let tail = opcodes.tail();
    let tag = combineSlice(new ListSlice(head, tail));

    let guard = new JumpIfNotModifiedOpcode(tag, END);

    opcodes.insertBefore(guard, head);
    opcodes.append(new DidModifyOpcode(guard));
    opcodes.append(END);
  }

  enter(ops: OpSeq) {
    let updating = new LinkedList<UpdatingOpcode>();

    let tracker = this.stack().pushUpdatableBlock();
    let state = this.capture();

    let tryOpcode = new TryOpcode(ops, state, tracker, updating);

    this.didEnter(tryOpcode, updating);
  }

  enterWithKey(key: string, ops: OpSeq) {
    let updating = new LinkedList<UpdatingOpcode>();

    let tracker = this.stack().pushUpdatableBlock();
    let state = this.capture();

    let tryOpcode = new TryOpcode(ops, state, tracker, updating);

    this.listBlockStack.current.map[key] = tryOpcode;

    this.didEnter(tryOpcode, updating);
  }

  enterList(ops: OpSeq) {
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

    let parent = this.updatingOpcodeStack.current.tail() as BlockOpcode;

    parent.didInitializeChildren();
  }

  exitList() {
    this.exit();
    this.listBlockStack.pop();
  }

  updateWith(opcode: UpdatingOpcode) {
    this.updatingOpcodeStack.current.append(opcode);
  }

  stack(): ElementStack {
    return this.elementStack;
  }

  scope(): Scope {
    return this.scopeStack.current;
  }

  dynamicScope(): DynamicScope {
    return this.dynamicScopeStack.current;
  }

  pushFrame(
    block: CompiledBlock,
    args?: EvaluatedArgs,
    callerScope?: Scope
  ) {
    this.frame.push(block.ops);

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
    shadow: ReadonlyArray<string>
  ) {
    this.frame.push(layout.ops, component, manager, shadow);

    if (args) this.frame.setArgs(args);
    if (args && args.blocks) this.frame.setBlocks(args.blocks);
    if (callerScope) this.frame.setCallerScope(callerScope);
  }

  pushEvalFrame(ops: OpSeq) {
    this.frame.push(ops);
  }

  pushChildScope() {
    this.scopeStack.push(this.scopeStack.current.child());
  }

  pushCallerScope() {
    this.scopeStack.push(this.scope().getCallerScope());
  }

  pushDynamicScope(): DynamicScope {
    let child = this.dynamicScopeStack.current.child();
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

  getArgs(): EvaluatedArgs {
    return this.frame.getArgs();
  }

  /// EXECUTION

  resume(opcodes: OpSeq, frame: CapturedFrame): RenderResult {
    return this.execute(opcodes, vm => vm.frame.restore(frame));
  }

  execute(opcodes: OpSeq, initialize?: (vm: VM) => void): RenderResult {
    LOGGER.debug("[VM] Begin program execution");

    let { elementStack, frame, updatingOpcodeStack, env } = this;

    elementStack.pushSimpleBlock();

    updatingOpcodeStack.push(new LinkedList<UpdatingOpcode>());
    frame.push(opcodes);

    if (initialize) initialize(this);

    let opcode: Opcode;

    while (frame.hasOpcodes()) {
      if (opcode = frame.nextStatement()) {
        LOGGER.debug(`[VM] OP ${opcode.type}`);
        LOGGER.trace(opcode);
        opcode.evaluate(this);
      }
    }

    LOGGER.debug("[VM] Completed program execution");

    return new RenderResult(
      env,
      updatingOpcodeStack.pop(),
      elementStack.popBlock()
    );
  }

  evaluateOpcode(opcode: Opcode) {
    opcode.evaluate(this);
  }

  // Make sure you have opcodes that push and pop a scope around this opcode
  // if you need to change the scope.
  invokeBlock(block: InlineBlock, args: EvaluatedArgs) {
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
    shadow: ReadonlyArray<string>
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
    let args = this.frame.getArgs();

    assert(args, "Cannot bind positional args");

    let { positional } = args;

    let scope = this.scope();

    for(let i=0; i < symbols.length; i++) {
      scope.bindSymbol(symbols[i], positional.at(i));
    }
  }

  bindNamedArgs(names: string[], symbols: number[]) {
    let args = this.frame.getArgs();
    let scope = this.scope();

    assert(args, "Cannot bind named args");

    let { named } = args;

    for(let i=0; i < names.length; i++) {
      scope.bindSymbol(symbols[i], named.get(names[i]));
    }
  }

  bindBlocks(names: string[], symbols: number[]) {
    let blocks = this.frame.getBlocks();
    let scope = this.scope();

    for(let i=0; i < names.length; i++) {
      scope.bindBlock(symbols[i], (blocks && blocks[names[i]]) || null);
    }
  }

  bindPartialArgs(symbol: number) {
    let args = this.frame.getArgs();
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

  bindDynamicScope(names: ReadonlyArray<string>) {
    let args = this.frame.getArgs();
    let scope = this.dynamicScope();

    assert(args, "Cannot bind dynamic scope");

    for(let i=0; i < names.length; i++) {
      scope.set(names[i], args.named.get(names[i]));
    }
  }
}

interface ExceptionHandler {
  handleException(initialize?: (vm: VM) => void);
}

interface ReturnHandler {
  setRenderResult(renderResult: RenderResult);
}
