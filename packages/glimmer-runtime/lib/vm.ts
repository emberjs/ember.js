import { Scope, Environment } from './environment';
import { Bounds, clear, move } from './bounds';
import { ElementStack } from './builder';
import { Stack, LinkedList, InternedString, Dict, dict } from 'glimmer-util';
import { ConstReference, ChainableReference, PathReference, RootReference, ListManager, ListIterator, ListDelegate } from 'glimmer-reference';
import Template from './template';
import { Templates } from './syntax/core';
import { RawTemplate } from './compiler';
import { CompiledExpression } from './compiled/expressions';
import { CompiledArgs, EvaluatedArgs } from './compiled/expressions/args';
import { Opcode, OpSeq, UpdatingOpcode, UpdatingOpSeq } from './opcodes';
import { Range } from './utils';
import DOMHelper from './dom';

interface VMOptions {
  self: RootReference;
  elementStack: ElementStack;
  size: number;
}

interface Registers {
  operand: PathReference;
  args: EvaluatedArgs;
  condition: ChainableReference;
  iterator: ListIterator;
  key: InternedString;
  templates: Dict<Template>;
}

interface FrameDidPop {
  frameDidPop();
}

type OpList = Range<Opcode>;

export class VM {
  public env: Environment;
  private scopeStack = new Stack<Scope>();
  private elementStack: ElementStack;
  public updatingOpcodeStack = new Stack<LinkedList<UpdatingOpcode>>();
  public listBlockStack = new Stack<ListBlockOpcode>();
  public frame = new FrameStack();

  static initial(env: Environment, { elementStack, self, size }: VMOptions) {
    let scope = env.createRootScope(size).init({ self });
    return new VM(env, scope, elementStack);
  }

  constructor(env: Environment, scope: Scope, elementStack: ElementStack) {
    this.env = env;
    this.elementStack = elementStack;
    this.scopeStack.push(scope);
  }

  goto(op: Opcode) {
    this.frame.goto(op);
  }

  enter(ops: OpSeq) {
    this.stack().openBlock();

    let updating = new LinkedList<UpdatingOpcode>();

    let tryOpcode = new TryOpcode({ ops, vm: this, updating });

    this.didEnter(tryOpcode, updating);
  }

  enterWithKey(key: InternedString, ops: OpSeq) {
    this.stack().openBlock();

    let updating = new LinkedList<UpdatingOpcode>();

    let tryOpcode = new TryOpcode({ ops, vm: this, updating });

    this.listBlockStack.current.map[<string>key] = tryOpcode;

    this.didEnter(tryOpcode, updating);
  }

  enterList(manager: ListManager, ops: OpSeq) {
    let updating = new LinkedList<BlockOpcode>();
    this.stack().openBlockList(updating);

    let opcode = new ListBlockOpcode({ ops, vm: this, updating, manager });

    this.listBlockStack.push(opcode);

    this.didEnter(opcode, updating);
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

  scope(): Scope {
    return this.scopeStack.current;
  }

  pushFrame(ops: OpSeq, args?: EvaluatedArgs, templates?: Templates, frameDidPop?: FrameDidPop) {
    this.frame.push(ops);
    if (args) this.frame.setArgs(args);
    if (templates) this.frame.setTemplates(<any>templates);
    if (frameDidPop) this.frame.setPopHandler(frameDidPop);
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

  popScope() {
    this.scopeStack.pop();
  }

  /// SCOPE HELPERS

  getSelf() {
    return this.scope().getSelf();
  }

  referenceForSymbol(symbol: number) {
    return this.scope().getSymbol(symbol);
  }

  /// EXECUTION

  execute(opcodes: OpSeq, initialize?: (vm: VM) => void): RenderResult {
    let { elementStack, frame, updatingOpcodeStack, env } = this;
    let self = this.scope().getSelf();

    elementStack.openBlock();

    updatingOpcodeStack.push(new LinkedList<UpdatingOpcode>());
    frame.push(opcodes);

    if (initialize) initialize(this);

    let opcode: Opcode;

    while (frame.hasOpcodes()) {
      if (opcode = frame.nextStatement()) opcode.evaluate(this);
    }

    return new RenderResult(updatingOpcodeStack.pop(), elementStack.closeBlock(), env.getDOM(), self);
  }

  evaluateOpcode(opcode: Opcode) {
    opcode.evaluate(this);
  }

  invoke(template: RawTemplate, args: CompiledArgs, templates: Templates) {
    this.elementStack.openBlock();
    let evaledArgs = args.evaluate(this);
    template.compile(this.env);
    this.pushFrame(template.ops, evaledArgs, templates, this);
  }

  frameDidPop() {
    this.elementStack.closeBlock();
  }

  evaluateOperand(expr: CompiledExpression) {
    this.frame.setOperand(expr.evaluate(this));
  }

  evaluateArgs(args: CompiledArgs) {
    let evaledArgs = this.frame.setArgs(args.evaluate(this));
    this.frame.setOperand(evaledArgs.positional.at(0));
  }

  bindArgs(positionalParams: number[], namedParams: Dict<number>) {
    let args = this.frame.getArgs();
    if (!args) return;

    let { positional, named } = args;

    let scope = this.scope();

    if (positionalParams) {
      for(let i = 0; i < positionalParams.length; i++) {
        let symbol = positionalParams[i];

        if (symbol !== 0) {
          scope.bindSymbol(symbol, positional.at(i));
        }
      }
    }

    if (namedParams) {
      Object.keys(namedParams).forEach(p => {
        scope.bindSymbol(namedParams[p], named.get(<InternedString>p));
      });
    }
  }

  setTemplates(templates: Dict<Template>) {
    this.frame.setTemplates(templates);
  }

  invokeTemplate(name: InternedString) {
    let template = this.frame.getTemplates()[<string>name].raw;
    template.compile(this.env);
    this.pushFrame(template.ops);
  }
}

export default VM;

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

      opcode.evaluate(this);
    }
  }

  try(ops: UpdatingOpSeq, handler: ExceptionHandler) {
    this.frameStack.push(new UpdatingVMFrame(this, ops, handler));
  }

  throw(initialize?: (vm: VM) => void) {
    this.frameStack.current.handleException(initialize);
  }

  evaluateOpcode(opcode: UpdatingOpcode) {
    opcode.evaluate(this);
  }
}

interface ExceptionHandler {
  handleException(initialize?: (vm: VM) => void);
}

interface BlockOpcodeOptions {
  ops: OpSeq;
  vm: VM;
  updating: LinkedList<UpdatingOpcode>;
}

abstract class BlockOpcode implements UpdatingOpcode, Bounds {
  public type = "block";
  public next = null;
  public prev = null;

  protected env: Environment;
  protected scope: Scope;
  protected updating: LinkedList<UpdatingOpcode>;
  protected bounds: Bounds;
  public ops: OpSeq;

  constructor({ ops, vm, updating }: BlockOpcodeOptions) {
    this.ops = ops;
    this.updating = updating;
    this.env = vm.env;
    this.scope = vm.scope();
    this.bounds = vm.stack().block();
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

  evaluate(vm: UpdatingVM) {
    vm.try(this.updating, null);
  }
}

class TryOpcode extends BlockOpcode implements UpdatingOpcode, ExceptionHandler {
  public type = "try";

  evaluate(vm: UpdatingVM) {
    vm.try(this.updating, this);
  }

  handleException(initialize?: (vm: VM) => void) {
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
    let reference = null;

    if (before) {
      reference = map[<string>before];
      nextSibling = reference.bounds.firstNode();
    }

    let vm = opcode.vmForInsertion(nextSibling);
    let tryOpcode;

    vm.execute(opcode.ops, vm => {
      vm.frame.setArgs(EvaluatedArgs.positional([item]));
      vm.frame.setOperand(item);
      vm.frame.setCondition(new ConstReference(true));
      vm.frame.setKey(key);

      tryOpcode = new TryOpcode({
        vm,
        ops: opcode.ops,
        updating: vm.updatingOpcodeStack.current
      });
    });

    updating.insertBefore(tryOpcode, reference);

    map[<string>key] = tryOpcode;
  }

  retain(key: InternedString, item: RootReference) {
  }

  move(key: InternedString, item: RootReference, before: InternedString) {
    let { map, updating } = this;

    let entry = map[<string>key];
    let reference = map[<string>before] || null;

    if (before) {
      move(entry, reference.firstNode());
    } else {
      move(entry, this.opcode.lastNode());
    }

    updating.remove(entry);
    updating.insertBefore(entry, reference);
  }

  delete(key: InternedString) {
    let { map } = this;
    let opcode = map[<string>key];
    clear(opcode);
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

  firstNode(): Node {
    let head: BlockOpcode = <any>this.updating.head();

    if (head) {
      return head.firstNode();
    } else {
      return this.lastNode();
    }
  }

  lastNode(): Node {
    return this.bounds.lastNode();
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

  handleException(initialize?: (vm: VM) => void) {
    this.exceptionHandler.handleException(initialize);
  }
}

export class RenderResult implements Bounds, ExceptionHandler {
  private updating: LinkedList<UpdatingOpcode>;
  private bounds: Bounds;
  private dom: DOMHelper;
  private self: PathReference;

  constructor(updating: LinkedList<UpdatingOpcode>, bounds: Bounds, dom: DOMHelper, self: PathReference) {
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

class Frame {
  ops: OpSeq;
  op: Opcode;
  operand: PathReference = null;
  args: EvaluatedArgs = null;
  condition: ChainableReference = null;
  iterator: ListIterator = null;
  key: InternedString = null;
  templates: Dict<Template> = null;
  popHandler: FrameDidPop = null;

  constructor(ops: OpSeq) {
    this.ops = ops;
    this.op = ops.head();
  }
}

class FrameStack {
  private frames: Frame[] = [];
  private frame: number = undefined;

  push(ops: OpSeq) {
    let frame = (this.frame === undefined) ? (this.frame = 0) : ++this.frame;

    if (this.frames.length <= frame) {
      this.frames.push(null);
    }

    this.frames[frame] = new Frame(ops);
  }

  pop() {
    let popHandler = this.getPopHandler();
    if (popHandler) popHandler.frameDidPop();

    let { frames, frame } = this;
    frames[frame] = null;
    this.frame = frame === 0 ? undefined : frame - 1;
  }

  getOps(): OpSeq {
    return this.frames[this.frame].ops;
  }

  getCurrent(): Opcode {
    return this.frames[this.frame].op;
  }

  setCurrent(op: Opcode): Opcode {
    return this.frames[this.frame].op = op;
  }

  getOperand(): PathReference {
    return this.frames[this.frame].operand;
  }

  setOperand(operand: PathReference): PathReference {
    return this.frames[this.frame].operand = operand;
  }

  getArgs(): EvaluatedArgs {
    return this.frames[this.frame].args;
  }

  setArgs(args: EvaluatedArgs): EvaluatedArgs {
    return this.frames[this.frame].args = args;
  }

  getCondition(): ChainableReference {
    return this.frames[this.frame].condition;
  }

  setCondition(condition: ChainableReference): ChainableReference {
    return this.frames[this.frame].condition = condition;
  }

  getIterator(): ListIterator {
    return this.frames[this.frame].iterator;
  }

  setIterator(iterator: ListIterator): ListIterator {
    return this.frames[this.frame].iterator = iterator;
  }

  getKey(): InternedString {
    return this.frames[this.frame].key;
  }

  setKey(key: InternedString): InternedString {
    return this.frames[this.frame].key = key;
  }

  getTemplates(): Dict<Template> {
    return this.frames[this.frame].templates;
  }

  setTemplates(templates: Dict<Template>): Dict<Template> {
    return this.frames[this.frame].templates = templates;
  }

  getPopHandler(): FrameDidPop {
    return this.frames[this.frame].popHandler;
  }

  setPopHandler(handler: FrameDidPop): FrameDidPop {
    return this.frames[this.frame].popHandler = handler;
  }

  goto(op: Opcode) {
    this.setCurrent(op);
  }

  hasOpcodes(): boolean {
    return this.frame !== undefined;
  }

  nextStatement(): Opcode {
    let op = this.frames[this.frame].op;
    let ops = this.getOps();

    if (op) {
      this.setCurrent(ops.nextNode(op));
      return op;
    } else {
      this.pop();
      return null;
    }
  }
}

enum Slots {
  Ops = 0,
  Current = 1,
  Operand = 2,
  Args = 3,
  Condition = 4,
  Iterator = 5,
  Key = 6,
  Templates = 7
}