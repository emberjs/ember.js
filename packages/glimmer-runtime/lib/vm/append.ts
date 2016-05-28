import { Scope, DynamicScope, Environment } from '../environment';
import { ElementStack } from '../builder';
import { Destroyable, Dict, Stack, LinkedList, ListSlice, LOGGER, InternedString, Opaque } from 'glimmer-util';
import { PathReference, ReferenceIterator, combineSlice } from 'glimmer-reference';
import Template from '../template';
import { Templates } from '../syntax/core';
import { InlineBlock, CompiledBlock } from '../compiled/blocks';
import { CompiledExpression } from '../compiled/expressions';
import { CompiledArgs, EvaluatedArgs } from '../compiled/expressions/args';
import { Opcode, OpSeq, UpdatingOpcode } from '../opcodes';
import { LabelOpcode, JumpIfNotModifiedOpcode, DidModifyOpcode } from '../compiled/opcodes/vm';
import { Range } from '../utils';

import { VMState, ListBlockOpcode, TryOpcode, BlockOpcode } from './update';
import RenderResult from './render-result';
import { FrameStack, Blocks } from './frame';

interface VMInitialOptions {
  self: PathReference<Opaque>;
  dynamicScope: DynamicScope;
  elementStack: ElementStack;
  size: number;
}

interface VMConstructorOptions {
  env: Environment;
  scope: Scope;
  dynamicScope: DynamicScope;
  elementStack: ElementStack;
}

interface Registers {
  operand: PathReference<any>;
  args: EvaluatedArgs;
  condition: PathReference<boolean>;
  iterator: ReferenceIterator;
  key: InternedString;
  templates: Dict<Template>;
}

interface InvokeLayoutOptions {
  args: EvaluatedArgs;
  shadow: InternedString[];
  layout: CompiledBlock;
  templates: Templates;
  callerScope: Scope;
}

interface PushFrameOptions {
  block: CompiledBlock;
  args?: EvaluatedArgs;
  blocks?: Blocks;
  callerScope?: Scope;
}

export interface PublicVM {
  env: Environment;
  getArgs(): EvaluatedArgs;
  dynamicScope(): DynamicScope;
  getSelf(): PathReference<Opaque>;
}

type OpList = Range<Opcode>;

export default class VM implements PublicVM {
  public env: Environment;
  private dynamicScopeStack = new Stack<DynamicScope>();
  private scopeStack = new Stack<Scope>();
  private elementStack: ElementStack;
  public updatingOpcodeStack = new Stack<LinkedList<UpdatingOpcode>>();
  public cacheGroups = new Stack<UpdatingOpcode>();
  public listBlockStack = new Stack<ListBlockOpcode>();
  public frame = new FrameStack();

  static initial(env: Environment, { elementStack, self, dynamicScope, size }: VMInitialOptions) {
    let scope = Scope.root(self, size);
    return new VM({ env, scope, dynamicScope, elementStack });
  }

  constructor({ env, scope, dynamicScope, elementStack }: VMConstructorOptions) {
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
      block: this.stack().block()
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

    let END = new LabelOpcode({ label: "END" });

    let opcodes = this.updatingOpcodeStack.current;
    let marker = this.cacheGroups.pop();
    let head = marker ? opcodes.nextNode(marker) : opcodes.head();
    let tail = opcodes.tail();
    let tag = combineSlice(new ListSlice(head, tail));

    let guard = new JumpIfNotModifiedOpcode({ tag, target: END });

    opcodes.insertBefore(guard, head);
    opcodes.append(new DidModifyOpcode({ target: guard }));
    opcodes.append(END);
  }

  enter(ops: OpSeq) {
    let updating = new LinkedList<UpdatingOpcode>();

    this.stack().pushBlock();
    let state = this.capture();

    let tryOpcode = new TryOpcode({ ops, state, children: updating });

    this.didEnter(tryOpcode, updating);
  }

  enterWithKey(key: InternedString, ops: OpSeq) {
    let updating = new LinkedList<UpdatingOpcode>();

    this.stack().pushBlock();
    let state = this.capture();

    let tryOpcode = new TryOpcode({ ops, state, children: updating });

    this.listBlockStack.current.map[<string>key] = tryOpcode;

    this.didEnter(tryOpcode, updating);
  }

  enterList(ops: OpSeq) {
    let updating = new LinkedList<BlockOpcode>();

    this.stack().pushBlockList(updating);
    let state = this.capture();
    let artifacts = this.frame.getIterator().artifacts;

    let opcode = new ListBlockOpcode({ ops, state, children: updating, artifacts });

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

  pushFrame({ block, args, blocks, callerScope }: PushFrameOptions) {
    this.frame.push(block.ops);

    if (args) this.frame.setArgs(args);
    if (blocks) this.frame.setBlocks(blocks);
    if (callerScope) this.frame.setCallerScope(callerScope);
  }

  popFrame() {
    let { frame } = this;

    frame.pop();
    let current = frame.getCurrent();

    if (current === null) return;
  }

  pushChildScope() {
    this.scopeStack.push(this.scopeStack.current.child());
  }

  pushCallerScope() {
    this.scopeStack.push(this.scope().getCallerScope());
  }

  pushDynamicScope() {
    this.dynamicScopeStack.push(this.dynamicScopeStack.current.child());
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

  execute(opcodes: OpSeq, initialize?: (vm: VM) => void): RenderResult {
    LOGGER.debug("[VM] Begin program execution");

    let { elementStack, frame, updatingOpcodeStack, env } = this;

    elementStack.pushBlock();

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

    return new RenderResult({
      env,
      updating: updatingOpcodeStack.pop(),
      bounds: elementStack.popBlock()
    });
  }

  evaluateOpcode(opcode: Opcode) {
    opcode.evaluate(this);
  }

  // Make sure you have opcodes that push and pop a scope around this opcode
  // if you need to change the scope.
  invokeBlock(block: InlineBlock, args: EvaluatedArgs) {
    let compiled = block.compile(this.env);
    this.pushFrame({ block: compiled, args });
  }

  invokeLayout({ args, layout, templates, callerScope }: InvokeLayoutOptions) {
    this.pushFrame({ block: layout, blocks: templates, callerScope, args });
  }

  evaluateOperand(expr: CompiledExpression<any>) {
    this.frame.setOperand(expr.evaluate(this));
  }

  evaluateArgs(args: CompiledArgs) {
    let evaledArgs = this.frame.setArgs(args.evaluate(this));
    this.frame.setOperand(evaledArgs.positional.at(0));
  }

  bindPositionalArgs(entries: number[]) {
    let args = this.frame.getArgs();
    if (!args) return;

    let { positional } = args;

    let scope = this.scope();

    for(let i=0; i < entries.length; i++) {
      scope.bindSymbol(entries[i], positional.at(i));
    }
  }

  bindNamedArgs(entries: Dict<number>) {
    let args = this.frame.getArgs();
    if (!args) return;

    let { named } = args;

    let keys = Object.keys(entries);
    let scope = this.scope();

    for(let i=0; i < keys.length; i++) {
      scope.bindSymbol(entries[keys[i]], named.get(<InternedString>keys[i]));
    }
  }

  bindBlocks(entries: Dict<number>) {
    let blocks = this.frame.getBlocks();
    let callerScope = this.frame.getCallerScope();

    let scope = this.scope();

    scope.bindCallerScope(callerScope);

    Object.keys(entries).forEach(name => {
      scope.bindBlock(entries[name], (blocks && blocks[name]) || null);
    });
  }

  bindDynamicScope(callback: BindDynamicScopeCallback) {
    callback(this, this.dynamicScope());
  }
}

export type BindDynamicScopeCallback = (vm: PublicVM, dynamicScope: DynamicScope) => void;

interface ExceptionHandler {
  handleException(initialize?: (vm: VM) => void);
}

interface ReturnHandler {
  setRenderResult(renderResult: RenderResult);
}
