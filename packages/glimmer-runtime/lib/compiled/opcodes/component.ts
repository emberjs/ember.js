import { Opcode } from '../../opcodes';
import { VM } from '../../vm';
import { ComponentInvocation } from '../../component/interfaces';
import { CompiledArgs } from '../../compiled/expressions/args';

export class OpenComponentOpcode extends Opcode {
  public type = "open-component";
  private invocation: ComponentInvocation;
  private args: CompiledArgs;

  constructor(invocation: ComponentInvocation, args: CompiledArgs) {
    super();
    this.invocation = invocation;
    this.args = args;
  }

  evaluate(vm: VM) {
    let { args, invocation: { templates, layout } } = this;
    vm.invoke(layout, args, templates);
  }
}