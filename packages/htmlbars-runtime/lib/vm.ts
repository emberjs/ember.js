import { Scope, Environment, Frame } from './environment';
import { Bounds } from './morph';
import { ElementStack } from './builder';
import { LinkedList, LinkedListNode, ListSlice, Slice, InternedString, Dict, dict } from 'htmlbars-util';
import { ConstReference, ChainableReference, PathReference, RootReference, ListManager, ListIterator, ListDelegate } from 'htmlbars-reference';
import Template, { EvaluatedParamsAndHash as EvaluatedArgs, ParamsAndHash as Args } from './template';
import { StatementSyntax, ExpressionSyntax, Opcode, OpSeq, UpdatingOpcode, UpdatingOpSeq } from './opcodes';
import DOMHelper from './dom';
import { clear, move } from './morph';

interface VMOptions<T> {
  self: any,
  localNames: InternedString[];
  blockArguments: any[];
  elementStack: ElementStack;
  hostOptions: T;
}

interface Registers {
  operand: ChainableReference;
  args: EvaluatedArgs;
  condition: ChainableReference;
  iterator: ListIterator;
  key: InternedString;
}

class Stack<T> {
  private stack: T[] = [];
  public current: T = null;

  push(item: T) {
    this.current = item;
    this.stack.push(item);
  }

  pop(): T {
    let item = this.stack.pop();
    this.current = this.stack[this.stack.length-1];
    return item;
  }

  isEmpty(): boolean {
    return this.stack.length === 0;
  }
}

export class VM<T> {
  public env: Environment<T>;
  private frameStack = new LinkedList<VMFrame<T>>();
  public currentFrame: VMFrame<T> = null;
  private currentScope: Scope<T>;
  private scopeStack: Scope<T>[] = [];
  private elementStack: ElementStack;
  public updatingOpcodeStack = new Stack<LinkedList<UpdatingOpcode>>();
  public listBlockStack = new Stack<ListBlockOpcode>();

  public registers: Registers;

  static initial(env: Environment<any>, { self, localNames, blockArguments, hostOptions, elementStack }: VMOptions<any>) {
    let scope = env.createRootScope().init({ self, localNames, blockArguments, hostOptions });
    return new VM(env, scope, elementStack);
  }

  constructor(env: Environment<T>, scope: Scope<any>, elementStack: ElementStack) {
    this.env = env;
    this.pushScope(scope);
    this.elementStack = elementStack;
  }

  goto(opcode: Opcode) {
    this.currentFrame.goto(opcode);
  }

  enter(ops: OpSeq) {
    this.stack().openBlock();

    let updating = new LinkedList<UpdatingOpcode>();

    let tryOpcode = new TryOpcode({ ops, vm: this, updating });

    this.didEnter(tryOpcode, updating);
  }

  enterList(manager: ListManager, ops: OpSeq) {
    this.stack().openBlockList();

    let updating = new LinkedList<UpdatingOpcode>();

    let opcode = new ListBlockOpcode({ ops, vm: this, updating, manager });

    this.listBlockStack.push(opcode);

    this.didEnter(opcode, updating);
  }

  enterWithKey(key: InternedString, ops: OpSeq) {
    this.stack().openKeyedBlock(key);

    let updating = new LinkedList<UpdatingOpcode>();

    let tryOpcode = new TryOpcode({ ops, vm: this, updating });

    this.listBlockStack.current.map[<string>key] = tryOpcode;

    this.didEnter(tryOpcode, updating);
  }

  private didEnter(opcode: BlockOpcode, updating: LinkedList<UpdatingOpcode>) {
    this.updateWith(opcode);
    this.updatingOpcodeStack.push(updating);
  }

  exit() {
    this.stack().closeBlock();
    this.updatingOpcodeStack.pop();
  }

  exitList() {
    this.exit();
    this.listBlockStack.pop();
  }

  updateWith(opcode: UpdatingOpcode) {
    this.updatingOpcodeStack.current.insertBefore(opcode, null);
  }

  stack(): ElementStack {
    return this.elementStack;
  }

  scope(): Scope<T> {
    return this.currentScope;
  }

  dupScope() {
    return this.pushScope(this.currentScope);
  }

  pushFrame(ops: OpSeq) {
    this.frameStack.append(new VMFrame(this, ops));
  }

  popFrame() {
    this.frameStack.pop();
    let currentFrame = this.currentFrame = this.frameStack.tail();

    if (!currentFrame) return;

    this.registers = this.currentFrame.registers;
  }

  pushChildScope({ self, localNames, blockArguments, blockArgumentReferences }: { self?: any, localNames: InternedString[], blockArguments?: any[], blockArgumentReferences?: PathReference[] }): Scope<T> {
    let scope = this.currentScope.child(localNames);

    if (localNames && localNames.length) {
      if (blockArguments) scope.bindLocals(blockArguments);
      else if (blockArgumentReferences) scope.bindLocalReferences(blockArgumentReferences);
    }

    if (self !== undefined) {
      scope.bindSelf(self);
    }

    return this.pushScope(scope);
  }

  pushScope(scope: Scope<T>): Scope<T> {
    this.scopeStack.push(scope);
    this.currentScope = scope;
    return scope;
  }

  popScope(): Scope<T> {
    let scope = this.currentScope;
    this.scopeStack.pop();
    this.currentScope = this.scopeStack[this.scopeStack.length - 1];
    return scope;
  }

  execute(opcodes: OpSeq, initialize?: (vm: VM<any>) => void): RenderResult {
    console.group("execute");
    console.time("execute");

    let { elementStack, frameStack } = this;
    let renderResult;

    elementStack.openBlock();

    this.updatingOpcodeStack.push(new LinkedList<UpdatingOpcode>());
    this.frameStack.append(new VMFrame(this, opcodes));

    if (initialize) initialize(this);

    while (true) {
      if (frameStack.isEmpty()) break;

      let opcode = this.currentFrame.nextStatement();


      if (opcode === null) {
        this.popFrame();
        // this.popScope();
        continue;
      }

      console.time(opcode.type);
      this.evaluateOpcode(opcode);
      console.timeEnd(opcode.type);
    }

    console.timeEnd("execute");
    console.groupEnd();

    return new RenderResult(this.updatingOpcodeStack.pop(), elementStack.closeBlock(), this.env.getDOM(), this.currentScope.getSelf());
  }

  evaluateOpcode(opcode: Opcode) {
    opcode.evaluate(this);
  }

  invoke(template: Template, morph: ReturnHandler) {
    this.elementStack.openBlock();
    this.frameStack.append(new VMFrame(this, template.raw.opcodes(this.env)));
  }

  evaluateArgs(args: Args) {
    let evaledArgs = this.registers.args = args.evaluate(new Frame(this.env, this.currentScope));
    this.registers.operand = evaledArgs.params.nth(0);
  }
}

export class UpdatingVM {
  private frameStack: Stack<UpdatingVMFrame> = new Stack<UpdatingVMFrame>();
  public dom: DOMHelper;

  constructor(dom: DOMHelper) {
    this.dom = dom;
  }

  execute(opcodes: UpdatingOpSeq, handler: ExceptionHandler) {
    let { frameStack } = this;

    this.try(opcodes, handler);

    while (true) {
      if (frameStack.isEmpty()) break;

      let opcode = this.frameStack.current.nextStatement();

      if (opcode === null) {
        this.frameStack.pop();
        continue;
      }

      this.evaluateOpcode(opcode);
    }
  }

  try(ops: UpdatingOpSeq, handler: ExceptionHandler) {
    this.frameStack.push(new UpdatingVMFrame(this, ops, handler));
  }

  throw(initialize?: (vm: VM<any>) => void) {
    this.frameStack.current.handleException(initialize);
  }

  evaluateOpcode(opcode: UpdatingOpcode) {
    opcode.evaluate(this);
  }
}

interface ExceptionHandler {
  handleException(initialize?: (vm: VM<any>) => void);
}

interface BlockOpcodeOptions {
  ops: OpSeq,
  vm: VM<any>;
  updating: LinkedList<UpdatingOpcode>;
}

abstract class BlockOpcode implements UpdatingOpcode {
  public type = "block";
  public next = null;
  public prev = null;

  protected env: Environment<any>;
  protected scope: Scope<any>;
  protected updating: LinkedList<UpdatingOpcode>;
  public bounds: Bounds;
  public ops: OpSeq;

  constructor({ ops, vm, updating }: BlockOpcodeOptions) {
    this.ops = ops;
    this.updating = updating;
    this.env = vm.env;
    this.scope = vm.scope();
    this.bounds = vm.stack().blockElement;
  }

  evaluate(vm: UpdatingVM) {
    vm.try(this.updating, null);
  }
}

class TryOpcode extends BlockOpcode implements UpdatingOpcode, ExceptionHandler {
  public type = "try";

  evaluate(vm: UpdatingVM) {
    vm.try(this.updating, this);
  }

  handleException(initialize?: (vm: VM<any>) => void) {
    let stack = new ElementStack({
      dom: this.env.getDOM(),
      parentNode: this.bounds.parentElement(),
      nextSibling: initialize ? this.bounds.lastNode().nextSibling : clear(this.bounds)
    });

    let vm = new VM(this.env, this.scope, stack);
    let result = vm.execute(this.ops, initialize);

    if (!initialize) {
      this.updating = result.opcodes();
    }

    this.bounds = result;
  }
}

class ListRevalidationDelegate implements ListDelegate {
  private opcode: ListBlockOpcode;
  private map: Dict<BlockOpcode>;
  private updating: LinkedList<UpdatingOpcode>;

  constructor(opcode: ListBlockOpcode) {
    let { map, updating } = opcode;
    this.opcode = opcode;
    this.map = map;
    this.updating = updating;
  }

  insert(key: InternedString, item: RootReference, before: InternedString) {
    let { map, opcode, updating } = this;
    let nextSibling: Node = null;

    if (before) {
      nextSibling = map[<string>before].bounds.firstNode();
    }

    let vm = opcode.vmForInsertion(nextSibling);
    let tryOpcode;

    let result = vm.execute(opcode.ops, vm => {
      vm.registers.args = EvaluatedArgs.single(item);
      vm.registers.operand = item;
      vm.registers.condition = new ConstReference(true);
      vm.registers.key = key;

      tryOpcode = new TryOpcode({
        vm,
        ops: opcode.ops,
        updating: vm.updatingOpcodeStack.current
      });
    });

    updating.append(tryOpcode);

    map[<string>key] = tryOpcode;
  }

  retain(key: InternedString, item: RootReference) {
  }

  move(key: InternedString, item: RootReference, before: InternedString) {
    let { map } = this;

    let entry = map[<string>key];
    let reference = map[<string>before];

    if (before) {
      move(entry.bounds, reference.bounds.firstNode());
    } else {
      move(entry.bounds, this.opcode.bounds.lastNode());
    }
  }

  delete(key: InternedString) {
    let { map } = this;
    let opcode = map[<string>key];
    clear(opcode.bounds);
    this.updating.remove(opcode);
    delete map[<string>key];
  }

  done() {
    // this.vm.registers.condition = new ConstReference(false);
  }
}

interface ListBlockOpcodeOptions extends BlockOpcodeOptions {
  manager: ListManager;
}

class ListBlockOpcode extends BlockOpcode {
  public type = "list-block";
  public map = dict<BlockOpcode>();
  public manager: ListManager;

  constructor(options: ListBlockOpcodeOptions) {
    super(options);
    this.manager = options.manager;
  }

  evaluate(vm: UpdatingVM) {
    // Revalidate list somehow....
    let delegate = new ListRevalidationDelegate(this);

    this.manager.sync(delegate);

    // Run now-updated updating opcodes
    super.evaluate(vm);
  }

  vmForInsertion(nextSibling?: Node) {
    let stack = new ElementStack({
      dom: this.env.getDOM(),
      parentNode: this.bounds.parentElement(),
      nextSibling: nextSibling || this.bounds.lastNode()
    });

    return new VM(this.env, this.scope, stack);
  }
}

class UpdatingVMFrame {
  private vm: UpdatingVM;
  private ops: UpdatingOpSeq;
  private current: UpdatingOpcode;
  private exceptionHandler: ExceptionHandler;

  constructor(vm: UpdatingVM, ops: UpdatingOpSeq, handler: ExceptionHandler) {
    this.vm = vm;
    this.ops = ops;
    this.current = ops.head();
    this.exceptionHandler = handler;
  }

  nextStatement(): UpdatingOpcode {
    let { current, ops } = this;
    if (current) this.current = ops.nextNode(current);
    return current;
  }

  handleException(initialize?: (vm: VM<any>) => void) {
    this.exceptionHandler.handleException(initialize);
  }
}

export class RenderResult implements Bounds, ExceptionHandler {
  private updating: LinkedList<UpdatingOpcode>;
  private bounds: Bounds;
  private dom: DOMHelper;
  private self: RootReference;

  constructor(updating: LinkedList<UpdatingOpcode>, bounds: Bounds, dom: DOMHelper, self: RootReference) {
    this.updating = updating;
    this.bounds = bounds;
    this.dom = dom;
    this.self = self;
  }

  rerender(self?: any) {
    let vm = new UpdatingVM(this.dom);

    if (self !== undefined) {
      this.self.update(self);
    }

    vm.execute(this.updating, this);
  }

  parentElement() {
    return this.bounds.parentElement();
  }

  firstNode() {
    return this.bounds.firstNode();
  }

  lastNode() {
    return this.bounds.lastNode();
  }

  opcodes(): LinkedList<UpdatingOpcode> {
    return this.updating;
  }

  handleException() {
    throw "this should never happen";
  }
}

interface ReturnHandler {
  setRenderResult(renderResult: RenderResult);
}

export class VMFrame<T> implements LinkedListNode {
  public next: VMFrame<T>;
  public prev: VMFrame<T>;

  private vm: VM<T>;
  public ops: OpSeq;
  public current: Opcode;
  public onReturn: ReturnHandler;

  public registers: Registers = {
    operand: null,
    args: null,
    condition: null,
    iterator: null,
    key: null
  };

  constructor(vm: VM<T>, ops: OpSeq) {
    this.vm = vm;
    this.ops = ops;
    this.current = ops.head();

    vm.currentFrame = this;
    vm.registers = this.registers;
  }

  goto(opcode: Opcode) {
    this.current = opcode;
  }

  nextStatement(): Opcode {
    let { current, ops } = this;
    if (current) this.current = ops.nextNode(current);
    return current;
  }

  // finalize(elementStack: ElementStack, scope: Scope<any>) {
    // this.onReturn.setRenderResult(elementStack.closeBlock(this.template));
  // }
}