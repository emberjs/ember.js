import { Opcode, UpdatingOpcode, ExpressionSyntax } from '../opcodes';
import { VM, UpdatingVM } from '../vm';
import { ElementStack } from '../builder';
import { EvaluatedParamsAndHash as EvaluatedArgs, ParamsAndHash as Args, RawTemplate } from '../template';
import { Frame } from '../environment';
import { InternedString, LITERAL } from 'htmlbars-util';
import { RootReference, ListManager, ListDelegate } from 'htmlbars-reference';

abstract class ListOpcode implements Opcode {
  public type: string;
  public next = null;
  public prev = null;

  abstract evaluate(vm: VM<any>);
}

abstract class ListUpdatingOpcode implements UpdatingOpcode {
  public type: string;
  public next = null;
  public prev = null;

  abstract evaluate(vm: UpdatingVM);
}

class IterateDelegate implements ListDelegate {
  private vm: VM<any>;

  constructor(vm: VM<any>) {
    this.vm = vm;
  }
  
  insert(key: InternedString, item: RootReference, before: InternedString) {
    this.vm.registers.args = EvaluatedArgs.single(item);
    this.vm.registers.operand = item;
  }

  retain() {}
  move() {}
  delete() {}
  done() {}
}

export class IterateOpcode extends ListOpcode {
  public type = "iterate";
  
  private elseTarget: Opcode;
  
  constructor(elseTarget: Opcode) {
    super();
    this.elseTarget = elseTarget;
  }

  evaluate(vm: VM<any>) {
    let delegate = new IterateDelegate(vm);
    let keyPath = vm.registers.args.hash.get(LITERAL("key")).value();

    let listRef = vm.registers.operand;
    let manager = new ListManager(<RootReference>listRef /* WTF */, keyPath, delegate);
    let iterator = vm.registers.iterator = manager.iterator();

    if (iterator.next()) {
      // vm.updateWith(???);
      vm.goto(this.elseTarget);
    } else {
      // vm.updateWith(???);
    }
  }
}

export class ContinueOpcode extends ListOpcode {
  public type = "continue";
  
  private iterTarget: Opcode;
  
  constructor(iterTarget: Opcode) {
    super();
    this.iterTarget = iterTarget;
  }
  
  evaluate(vm: VM<any>) {
    let iterator = vm.registers.iterator;

    if (!iterator.next()) {
      vm.goto(this.iterTarget);
    }
  }
}