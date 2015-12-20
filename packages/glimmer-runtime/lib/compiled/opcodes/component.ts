import { Opcode } from '../../opcodes';
import { ComponentDefinition } from '../../component/interfaces';
import { UpdateAttributeOpcode } from './dom';
import { VM } from '../../vm';
import { CompiledArgs } from '../../compiled/expressions/args';
import { InternedString, intern } from 'glimmer-util';
import { CONST_REFERENCE } from 'glimmer-reference';

export class OpenComponentOpcode extends Opcode {
  public type = "open-component";
  public definition: ComponentDefinition;
  public args: CompiledArgs;
  public shadow: InternedString[];

  constructor({ definition, args, shadow }: { definition: ComponentDefinition, args: CompiledArgs, shadow: InternedString[] }) {
    super();
    this.definition = definition;
    this.args = args;
    this.shadow = shadow;
  }

  evaluate(vm: VM) {
    let { args, shadow, definition } = this;

    vm.invokeLayout({ templates: null, args, shadow, definition });
  }
}

// Slow path for non-specialized component invocations. Uses an internal
// named lookup on the args.
export class ShadowAttributesOpcode extends Opcode {
  public type = "shadow-attributes";

  evaluate(vm: VM) {
    let args = vm.frame.getArgs();
    let internal = args.internal;
    let shadow: InternedString[] = internal['shadow'];
    let definition: ComponentDefinition = internal['definition'];

    let named = args.named;

    definition.didCreateElement(vm);

    if (!shadow) return;

    shadow.forEach(name => {
      let reference = named.get(intern(`@${name}`));
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