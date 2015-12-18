import { Opcode } from '../../opcodes';
import { UpdateAttributeOpcode } from './dom';
import { VM } from '../../vm';
import { ComponentInvocation } from '../../component/interfaces';
import { CompiledArgs } from '../../compiled/expressions/args';
import { InternedString } from 'glimmer-util';
import { CONST_REFERENCE } from 'glimmer-reference';

export class OpenComponentOpcode extends Opcode {
  public type = "open-component";
  public invocation: ComponentInvocation;
  public args: CompiledArgs;

  constructor(invocation: ComponentInvocation, args: CompiledArgs) {
    super();
    this.invocation = invocation;
    this.args = args;
  }

  evaluate(vm: VM) {
    let { args, invocation: { templates, layout } } = this;
    vm.invokeLayout(layout, args, templates);
  }
}

// Slow path for non-specialized component invocations. Uses an internal
// named lookup on the args.
export class ShadowAttributesOpcode extends Opcode {
  public type = "shadow-attributes";

  evaluate(vm: VM) {
    let args = vm.frame.getArgs();
    let internal = args.internal;
    let shadow: InternedString[] = internal && internal['shadow'];

    if (!shadow) return;

    let named = args.named;

    shadow.forEach(name => {
      let reference = named.get(name);
      let value = reference.value();
      vm.stack().setAttribute(name, value);

      if (!reference[CONST_REFERENCE]) {
        vm.updateWith(new UpdateAttributeOpcode(vm.stack().element, name, reference, value));
      }
    });
  }
}

export class CloseComponentOpcode extends Opcode {
  public type = "close-component";

  evaluate(vm: VM) {
    vm.popScope();
  }
}