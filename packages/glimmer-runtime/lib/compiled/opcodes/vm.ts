import { Opcode, UpdatingOpcode } from '../../opcodes';
import { CompiledExpression } from '../expressions';
import { CompiledArgs } from '../expressions/args';
import { VM, UpdatingVM } from '../../vm';
import { RawTemplate, RawBlock } from '../../compiler';
import { turbocharge } from '../../utils';
import { ListSlice, Slice, Dict, dict, assign } from 'glimmer-util';
import { ChainableReference } from 'glimmer-reference';

abstract class VMUpdatingOpcode implements UpdatingOpcode {
  public type: string;
  public next = null;
  public prev = null;

  abstract evaluate(vm: UpdatingVM);
}

export class PushChildScopeOpcode extends Opcode {
  public type = "push-child-scope";

  evaluate(vm: VM) {
    vm.pushChildScope();
  }
}

export class PushRootScopeOpcode extends Opcode {
  public type = "push-root-scope";
  public size: number;

  constructor({ size }: { size: number }) {
    super();
    this.size = size;
  }

  evaluate(vm: VM) {
    vm.pushRootScope(this.size);
  }
}

export class PopScopeOpcode extends Opcode {
  public type = "pop-scope";

  evaluate(vm: VM) {
    vm.popScope();
  }
}

export class PutValue extends Opcode {
  public type = "put-value";
  private expression: CompiledExpression;

  constructor({ expression }: { expression: CompiledExpression }) {
    super();
    this.expression = expression;
  }

  evaluate(vm: VM) {
    vm.evaluateOperand(this.expression);
  }
}

export class PutArgsOpcode extends Opcode {
  public type = "put-args";

  private args: CompiledArgs;

  constructor({ args }: { args: CompiledArgs }) {
    super();
    this.args = args;
  }

  evaluate(vm: VM) {
    vm.evaluateArgs(this.args);
  }
}

export class BindPositionalArgsOpcode extends Opcode {
  public type = "bind-positional-args";

  private positional: number[];

  constructor({ template }: { template: RawTemplate }) {
    super();

    let positional = this.positional = [];

    template.locals.forEach((name) => {
      positional.push(template.symbolTable.get(name));
    });
  }

  evaluate(vm: VM) {
    vm.bindPositionalArgs(this.positional);
  }
}

export class BindNamedArgsOpcode extends Opcode {
  public type = "bind-named-args";

  public named: Dict<number>;

  static create(template: RawTemplate) {
    let named = template.named.reduce(
      (obj, name) => assign(obj, { [<string>name]: template.symbolTable.get(name) }),
      dict<number>()
    );

    turbocharge(named);
    return new BindNamedArgsOpcode({ named });
  }

  constructor({ named }: { named: Dict<number> }) {
    super();
    this.named = named;
  }

  evaluate(vm: VM) {
    vm.bindNamedArgs(this.named);
  }
}

export class BindBlocksOpcode extends Opcode {
  public type = "bind-blocks";

  public blocks: number[];

  static create(template: RawTemplate) {
    let blocks = template.yields.map(name => template.symbolTable.getYield(name));
    return new BindBlocksOpcode({ blocks });
  }

  constructor({ blocks }: { blocks: number[] }) {
    super();
    this.blocks = blocks;
  }

  evaluate(vm: VM) {
    vm.bindBlocks(this.blocks);
  }
}

export class EnterOpcode extends Opcode {
  public type = "enter";
  private slice: Slice<Opcode>;

  constructor({ begin, end }: { begin: NoopOpcode, end: NoopOpcode }) {
    super();
    this.slice = new ListSlice(begin, end);
  }

  evaluate(vm: VM) {
    vm.enter(this.slice);
  }
}

export class ExitOpcode extends Opcode {
  public type = "exit";

  evaluate(vm: VM) {
    vm.exit();
  }
}

export class NoopOpcode extends Opcode {
  public type = "noop";

  public label: string = null;

  constructor({ label }: { label?: string }) {
    super();
    if (label) this.label = label;
  }

  evaluate(vm: VM) {
  }
}

export class EvaluateOpcode extends Opcode {
  public type = "evaluate";
  private template: RawBlock;

  constructor({ template }: { template: RawBlock }) {
    super();
    this.template = template;
  }

  evaluate(vm: VM) {
    this.template.compile(vm.env);
    vm.pushFrame(this.template.ops, vm.frame.getArgs());
  }
}

export class TestOpcode extends Opcode {
  public type = "test";

  evaluate(vm: VM) {
    vm.frame.setCondition(vm.frame.getOperand());
  }
}

export class JumpOpcode extends Opcode {
  public type = "jump";

  public target: NoopOpcode;

  constructor({ target }: { target: NoopOpcode }) {
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
    let reference = vm.frame.getCondition();
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
    let reference = vm.frame.getCondition();
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
