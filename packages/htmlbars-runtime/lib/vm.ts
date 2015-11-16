import { Scope, Environment, Frame } from './environment';
import { ElementStack } from './builder';
import { LinkedList, LinkedListNode, InternedString } from 'htmlbars-util';
import Template, { EvaluatedParamsAndHash as EvaluatedArgs, ParamsAndHash as Args } from './template';
import { StatementSyntax, ExpressionSyntax, Opcode, OpSeq } from './opcodes';

interface VMOptions<T> {
  self: any,
  localNames: InternedString[];
  blockArguments: any[];
  elementStack: ElementStack;
  hostOptions: T;
}

interface Registers {
  args: EvaluatedArgs;
}

export class VM<T> {
  private env: Environment<T>;
  private scopeStack: Scope<T>[] = [];
  private frameStack = new LinkedList<VMFrame<T>>();
  private currentScope: Scope<T>;
  private elementStack: ElementStack;

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

  goto(statement: StatementSyntax) {
    this.frameStack.tail().goto(statement);
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

  pushChildScope({ self, localNames, blockArguments }: { self: any, localNames: InternedString[], blockArguments: any[] }): Scope<T> {
    let scope = this.currentScope.child(localNames);

    if (localNames && localNames.length) {
      scope.bindLocals(blockArguments);
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

    let updating = new RenderResult();
    this.frameStack.append(new VMFrame(this, opcodes));
    opcodes.forEachNode(opcode => opcode.evaluate(this));
    return updating;

    // this.invoke(template, { setRenderResult(result) { renderResult = result } });
    // // let counter = 0;

    // while (true) {
    //   // if (counter++ > 10000) throw new Error("IE6 Error: Too many statements");

    //   if (frameStack.isEmpty()) break;

    //   let statement = frameStack.tail().nextStatement();

    //   if (statement === null) {
    //     let frame = frameStack.pop();
    //     frame.finalize(elementStack, this.currentScope);
    //     this.popScope();
    //     continue;
    //   }

    //   this.evaluateStatement(statement);
    // }
  }

  invoke(template: Template, morph: ReturnHandler) {
    this.elementStack.openBlock();
    this.frameStack.append(new VMFrame(this, template.opcodes(this.env)));
  }

  evaluateArgs(args: Args) {
    this.registers.args = args.evaluate(new Frame(this.env, this.currentScope));
  }

  private evaluateStatement(statement: StatementSyntax) {
    let { elementStack, frameStack, env } = this;
    let frame = frameStack.tail();

    let refinedStatement = env.statement(statement);

    let inlined = refinedStatement.inline();

    if (inlined) {
      frame.current = frame.template.splice(inlined, statement);
    } else if (refinedStatement !== statement) {
      frame.current = frame.template.replace(refinedStatement, statement);
    } else {
      let userFrame = new Frame(this.env, this.currentScope);
      let content = statement.evaluate(elementStack, userFrame, this);
      if (content) content.append(elementStack, this);
    }
  }
}

export class RenderResult {
  private updating: OpSeq;

  rerender() {
    return null;
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
    args: null
  };

  constructor(vm: VM<T>, ops: OpSeq) {
    this.vm = vm;
    this.ops = ops;
    this.current = ops.head();

    vm.registers = this.registers;
  }

  goto(statement: Opcode) {
    this.current = statement;
  }

  nextStatement(): Opcode {
    let { current, ops } = this;
    if (current) this.current = ops.nextNode(current);
    return current;
  }

  // finalize(elementStack: ElementStack, scope: Scope<any>) {
  //   this.onReturn.setRenderResult(elementStack.closeBlock(this.template));
  // }
}