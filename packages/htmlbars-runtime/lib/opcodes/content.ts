import { Opcode } from '../opcodes';
import { VM } from '../vm';
import { InternedString } from 'htmlbars-util';
import { Append } from '../template';

abstract class ContentOpcode implements Opcode {
  public type: string;
  public next = null;
  public prev = null;

  abstract evaluate(vm: VM<any>);
}

export class AppendOpcode extends ContentOpcode {
  constructor(append: Append) {
    super();
  }

  evaluate(vm: VM<any>) {
    let value = vm.registers.args.params.nth(0);
    vm.stack().appendText(value.value());
  }
}

export class TrustingAppendOpcode extends ContentOpcode {
  constructor(append: Append) {
    super();
  }

  evaluate(vm: VM<any>) {
    let value = vm.registers.args.params.nth(0);
    vm.stack().insertHTMLBefore(null, value.value());
  }
}