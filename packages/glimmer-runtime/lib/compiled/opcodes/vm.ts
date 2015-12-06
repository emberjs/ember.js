import { Opcode, UpdatingOpcode } from '../../opcodes';
import { CompiledExpression } from '../expressions';
import { CompiledArgs } from '../expressions/args';
import { VM, UpdatingVM } from '../../vm';
import { RawTemplate } from '../../compiler';
import { ListSlice } from 'glimmer-util';
import { ChainableReference } from 'glimmer-reference';

abstract class VMOpcode implements Opcode {
  public type: string;
  public next = null;
  public prev = null;

  abstract evaluate(vm: VM);
}

abstract class VMUpdatingOpcode implements UpdatingOpcode {
  public type: string;
  public next = null;
  public prev = null;

  abstract evaluate(vm: UpdatingVM);
}

export class PushChildScopeOpcode extends VMOpcode {
  public type = "push-child-scope";

  evaluate(vm: VM) {
    vm.pushChildScope();
  }
}

export class PopScopeOpcode extends VMOpcode {
  public type = "pop-scope";

  evaluate(vm: VM) {
    vm.popScope();
  }
}

export class PutValue extends VMOpcode {
  public type = "put-value";
  private expression: CompiledExpression;

  constructor(expression: CompiledExpression) {
    super();
    this.expression = expression;
  }

  evaluate(vm: VM) {
    vm.evaluateOperand(this.expression);
  }
}

export class PutArgsOpcode extends VMOpcode {
  public type = "put-args";

  private args: CompiledArgs;

  constructor(args: CompiledArgs) {
    super();
    this.args = args;
  }

  evaluate(vm: VM) {
    vm.evaluateArgs(this.args);
  }
}

export class BindArgsOpcode extends VMOpcode {
  public type = "bind-args";

  private symbols: number[];

  constructor(template: RawTemplate) {
    super();
    this.symbols = template.locals.map(name => template.symbolTable.get(name));
  }

  evaluate(vm: VM) {
    vm.bindArgs(this.symbols);
  }
}

export class EnterOpcode extends VMOpcode {
  public type = "enter";
  private slice: ListSlice<Opcode>;

  constructor(begin: Opcode, end: Opcode) {
    super();
    this.slice = new ListSlice(begin, end);
  }

  evaluate(vm: VM) {
    vm.enter(this.slice);
  }
}

export class ExitOpcode extends VMOpcode {
  public type = "exit";

  evaluate(vm: VM) {
    vm.exit();
  }
}

export class NoopOpcode extends VMOpcode {
  public type = "noop";

  private label: string = null;

  constructor(label?: string) {
    super();
    if (label) this.label = label;
  }

  evaluate(vm: VM) {
  }
}

export class EvaluateOpcode extends VMOpcode {
  public type = "evaluate";
  private template: RawTemplate;

  constructor(template: RawTemplate) {
    super();
    this.template = template;
  }

  evaluate(vm: VM) {
    vm.pushFrame(this.template.opcodes(vm.env));
  }
}

export class TestOpcode extends VMOpcode {
  public type = "test";

  evaluate(vm: VM) {
    vm.registers.condition = vm.registers.operand;
  }
}

export class JumpOpcode extends VMOpcode {
  public type = "jump";

  private target: Opcode;

  constructor(target: Opcode) {
    super();
    this.target = target;
  }

  evaluate(vm: VM) {
    vm.goto(this.target);
  }
}

export class JumpIfOpcode extends JumpOpcode {
  public type = "jump-if";

  evaluate(vm: VM) {
    let reference = vm.registers.condition;
    let value = reference.value();

    if (value) {
      super.evaluate(vm);
      vm.updateWith(new Assert(reference));
    } else {
      vm.updateWith(new AssertFalse(reference));
    }
  }
}

export class JumpUnlessOpcode extends JumpOpcode {
  public type = "jump-unless";

  evaluate(vm: VM) {
    let reference = vm.registers.condition;
    let value = reference.value();

    if (value) {
      vm.updateWith(new Assert(reference));
    } else {
      super.evaluate(vm);
      vm.updateWith(new AssertFalse(reference));
    }
  }
}

export class Assert extends VMUpdatingOpcode {
  public type = "assert";

  private reference: ChainableReference;

  constructor(reference: ChainableReference) {
    super();
    this.reference = reference;
  }

  evaluate(vm: UpdatingVM) {
    if (!this.reference.value()) {
      vm.throw();
    }
  }
}

export class AssertFalse extends VMUpdatingOpcode {
  public type = "assert";

  private reference: ChainableReference;

  constructor(reference: ChainableReference) {
    super();
    this.reference = reference;
  }

  evaluate(vm: UpdatingVM) {
    if (this.reference.value()) {
      vm.throw();
    }
  }
}
