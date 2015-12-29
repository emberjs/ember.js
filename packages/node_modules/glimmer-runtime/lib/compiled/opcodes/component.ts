import { Opcode } from '../../opcodes';
import { ComponentDefinition } from '../../component/interfaces';
import { UpdateAttributeOpcode } from './dom';
import { VM } from '../../vm';
import { CompiledArgs } from '../../compiled/expressions/args';
import { Templates } from '../../syntax/core';
import { InternedString, intern } from 'glimmer-util';
import { CONST_REFERENCE } from 'glimmer-reference';

interface OpenComponentOptions {
  definition: ComponentDefinition;
  args: CompiledArgs;
  shadow: InternedString[];
  templates: Templates;
}

export class OpenComponentOpcode extends Opcode {
  public type = "open-component";
  public definition: ComponentDefinition;
  public args: CompiledArgs;
  public shadow: InternedString[];
  public templates: Templates;

  constructor({ definition, args, shadow, templates }: OpenComponentOptions) {
    super();
    this.definition = definition;
    this.args = args;
    this.shadow = shadow;
    this.templates = templates;
  }

  evaluate(vm: VM) {
    let { args, shadow, definition, templates } = this;

    let symbols = definition.layout.symbolTable;
    let defaultTemplate = null;
    let inverseTemplate = null;

    if (templates.default) {
      defaultTemplate = symbols.getYield('default' as InternedString);
    }

    if (templates.inverse) {
      inverseTemplate = symbols.getYield('inverse' as InternedString);
    }

    vm.invokeLayout({ templates, args, shadow, definition, defaultTemplate, inverseTemplate });
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