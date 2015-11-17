import { Opcode, UpdatingOpcode, ExpressionSyntax } from '../opcodes';
import { VM, UpdatingVM } from '../vm';
import { ParamsAndHash as Args, RawTemplate } from '../template';
import { Frame } from '../environment';
import { InternedString } from 'htmlbars-util';
import { ChainableReference } from 'htmlbars-reference';

abstract class VMOpcode implements Opcode {
  public type: string;
  public next = null;
  public prev = null;

  abstract evaluate(vm: VM<any>);
}

abstract class VMUpdatingOpcode implements UpdatingOpcode {
  public type: string;
  public next = null;
  public prev = null;

  abstract evaluate(vm: UpdatingVM);
}

export class PushChildScopeOpcode extends VMOpcode {
  public type = "push-child-scope";

  private localNames: InternedString[];

  constructor(localNames: InternedString[]) {
    super();
    this.localNames = localNames;
  }

  evaluate(vm: VM<any>) {
    let { localNames } = this;
    let blockArgumentReferences = vm.registers.args.params.toArray();
    vm.pushChildScope({ localNames, blockArgumentReferences })
  }
}

export class PopScopeOpcode extends VMOpcode {
  public type = "pop-scope";

  evaluate(vm: VM<any>) {
    vm.popScope();
  }
}

export class ArgsOpcode extends VMOpcode {
  public type = "expression";

  private syntax: Args;

  constructor(syntax: Args) {
    super();
    this.syntax = syntax;
  }

  evaluate(vm: VM<any>) {
    vm.evaluateArgs(this.syntax);
  }
}

export class EnterOpcode extends VMOpcode {
  public type = "enter";

  private begin: Opcode;
  private end: Opcode;

  constructor(begin: Opcode, end: Opcode) {
    super();
    this.begin = begin;
    this.end = end;
  }

  evaluate(vm: VM<any>) {
    vm.enter(this.begin, this.end);
  }
}

export class ExitOpcode extends VMOpcode {
  public type = "exit";

  evaluate(vm: VM<any>) {
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

  evaluate(vm: VM<any>) {
  }
}

export class EvaluateOpcode extends VMOpcode {
  public type = "evaluate";
  private template: RawTemplate;

  constructor(template: RawTemplate) {
    super();
    this.template = template;
  }

  evaluate(vm: VM<any>) {
    vm.pushFrame(this.template.opcodes(vm.env));
  }
}

export class TestOpcode extends VMOpcode {
  public type = "test";

  evaluate(vm: VM<any>) {
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

  evaluate(vm: VM<any>) {
    vm.goto(this.target);
  }
}

export class JumpIfOpcode extends JumpOpcode {
  public type = "jump-if";

  evaluate(vm: VM<any>) {
    let reference = vm.registers.condition;
    let value = reference.value();

    if (value) {
      super.evaluate(vm);
      vm.updateWith(new Assert(reference));
    } else {
      vm.updateWith(new AssertFalse(reference));
    }
  }

export class JumpUnlessOpcode extends JumpOpcode {
  public type = "jump-unless";

  evaluate(vm: VM<any>) {
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

