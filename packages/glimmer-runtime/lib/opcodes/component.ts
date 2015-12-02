import { Opcode } from '../opcodes';
import { VM } from '../vm';
import { ComponentInvocation } from '../component/interfaces';
import { Dict } from 'glimmer-util';
import Template from '../template';

export class OpenComponentOpcode extends Opcode {
  public type = "open-component";
  private invocation: ComponentInvocation;

  constructor(invocation: ComponentInvocation) {
    super();
    this.invocation = invocation;
  }

  evaluate(vm: VM<any>) {
    vm.pushFrame(this.invocation.layout.opcodes(vm.env));
    vm.setTemplates(<any>this.invocation.templates);
  }
}