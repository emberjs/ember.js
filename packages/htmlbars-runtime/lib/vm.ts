import { Scope, Environment, Frame } from './environment';
import { Bounds } from './morph';
import { ElementStack } from './builder';
import { LinkedList, LinkedListNode, InternedString } from 'htmlbars-util';
import { ChainableReference, PathReference } from 'htmlbars-reference';
import Template, { EvaluatedParamsAndHash as EvaluatedArgs, ParamsAndHash as Args } from './template';
import { StatementSyntax, ExpressionSyntax, Opcode, OpSeq, UpdatingOpcode, UpdatingOpSeq } from './opcodes';
import DOMHelper from './dom';
import { clear } from './morph';

interface VMOptions<T> {
  self: any,
  localNames: InternedString[];
  blockArguments: any[];
  elementStack: ElementStack;
  hostOptions: T;
}

interface Registers {
  operand: ChainableReference;
  condition: ChainableReference;
  args: EvaluatedArgs;
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
  public updatingOpcodeStack: Stack<UpdatingOpSeq> = new Stack<UpdatingOpSeq>();

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

  enter(begin: Opcode, end: Opcode) {
    this.stack().openBlock();

    let updating = new LinkedList<UpdatingOpcode>();

    let tracker = this.stack().blockElement;

    let parentElement = this.stack().element;

    let bounds = {
      parentElement() {
        return parentElement;
      },

      firstNode() {
        return tracker.first.firstNode();
      },

      lastNode() {
        return tracker.last.lastNode();
      }
    };

    this.updateWith(new TryOpcode(begin, end, updating, this.env, this.currentScope, bounds));
    this.updatingOpcodeStack.push(updating);
  }

  exit() {
    this.stack().closeBlock();
    this.updatingOpcodeStack.pop();
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

  execute(opcodes: LinkedList<Opcode>): RenderResult {
    let { elementStack, frameStack } = this;
    let renderResult;

    this.updatingOpcodeStack.push(new LinkedList<UpdatingOpcode>());
    this.frameStack.append(new VMFrame(this, opcodes));

    while (true) {
      if (frameStack.isEmpty()) break;

      let opcode = this.currentFrame.nextStatement();

      if (opcode === null) {
        this.popFrame();
        // this.popScope();
        continue;
      }

      this.evaluateOpcode(opcode);
    }

    return new RenderResult(this.updatingOpcodeStack.pop(), elementStack.closeBlock(), this.env.getDOM());
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

  throw() {
    this.frameStack.current.handleException();
  }

  evaluateOpcode(opcode: UpdatingOpcode) {
    opcode.evaluate(this);
  }
}

interface ExceptionHandler {
  handleException();
}

class TryOpcode implements UpdatingOpcode, ExceptionHandler {
  public type = "try";
  public next = null;
  public prev = null;

  private begin: Opcode;
  private end: Opcode;
  private updating: UpdatingOpSeq;
  private env: Environment<any>;
  private scope: Scope<any>;
  private bounds: Bounds;

  constructor(begin: Opcode, end: Opcode, updating: UpdatingOpSeq, env: Environment<any>, scope: Scope<any>, bounds: Bounds) {
    this.begin = begin;
    this.end = end;
    this.updating = updating;
    this.env = env;
    this.scope = scope;
    this.bounds = bounds;
  }

  evaluate(vm: UpdatingVM) {
    vm.try(this.updating, this);
  }

  handleException() {
    let stack = new ElementStack({
      dom: this.env.getDOM(),
      parentNode: this.bounds.parentElement(),
      nextSibling: clear(this.bounds)
    });

    let vm = new VM(this.env, this.scope, stack);
    let result = vm.execute(<any>new LinkedListRange(this.begin, this.end));

    this.updating = result.opcodes();
    this.bounds = result;
  }
}

class LinkedListRange {
  private _head: LinkedListNode;
  private _tail: LinkedListNode;

  constructor(head: LinkedListNode, tail: LinkedListNode) {
    this._head = head;
    this._tail = tail;
  }

  head() {
    return this._head;
  }

  nextNode(node: LinkedListNode): LinkedListNode {
    if (node === this._tail) return null;
    return node.next;
  }

  isEmpty() {
    return false;
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

  handleException() {
    this.exceptionHandler.handleException();
  }
}

export class RenderResult implements Bounds, ExceptionHandler {
  private updating: UpdatingOpSeq;
  private bounds: Bounds;
  private dom: DOMHelper;

  constructor(updating: UpdatingOpSeq, bounds: Bounds, dom: DOMHelper) {
    this.updating = updating;
    this.bounds = bounds;
    this.dom = dom;
  }

  rerender() {
    let vm = new UpdatingVM(this.dom);
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

  opcodes(): UpdatingOpSeq {
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
    condition: null,
    args: null
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