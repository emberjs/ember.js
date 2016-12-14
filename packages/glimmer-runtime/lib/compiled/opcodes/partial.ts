import { Opaque, dict } from 'glimmer-util';
import { ReferenceCache, isConst, map } from 'glimmer-reference';
import { Opcode, OpcodeJSON } from '../../opcodes';
import { Assert } from './vm';
import { VM } from '../../vm';
import { PartialDefinition } from '../../partial';
import { SymbolTable } from 'glimmer-interfaces';
import { PartialBlock } from '../blocks';

export class PutDynamicPartialDefinitionOpcode extends Opcode {
  public type = "put-dynamic-partial-definition";

  constructor(private symbolTable: SymbolTable) {
    super();
  }

  evaluate(vm: VM) {
    let env = vm.env;
    let { symbolTable } = this;

    function lookupPartial(name: Opaque) {
      let normalized = String(name);

      if (!env.hasPartial(normalized, symbolTable)) {
        throw new Error(`Could not find a partial named "${normalized}"`);
      }

      return env.lookupPartial(normalized, symbolTable);
    }

    let reference = map(vm.frame.getOperand<Opaque>(), lookupPartial);
    let cache = isConst(reference) ? undefined : new ReferenceCache(reference);
    let definition = cache ? cache.peek() : reference.value();

    vm.frame.setImmediate(definition);

    if (cache) {
      vm.updateWith(new Assert(cache));
    }
  }

  toJSON(): OpcodeJSON {
    return {
      guid: this._guid,
      type: this.type,
      args: ["$OPERAND"]
    };
  }
}

export class PutPartialDefinitionOpcode extends Opcode {
  public type = "put-partial-definition";

  constructor(private definition: PartialDefinition<Opaque>) {
    super();
  }

  evaluate(vm: VM) {
    vm.frame.setImmediate(this.definition);
  }

  toJSON(): OpcodeJSON {
    return {
      guid: this._guid,
      type: this.type,
      args: [JSON.stringify(this.definition.name)]
    };
  }
}

export class EvaluatePartialOpcode extends Opcode {
  public type = "evaluate-partial";
  private cache = dict<PartialBlock>();

  constructor(private symbolTable: SymbolTable) {
    super();
  }

  evaluate(vm: VM) {
    let { template } = vm.frame.getImmediate<PartialDefinition<Opaque>>();

    let block = this.cache[template.id];

    if (!block) {
      block = template.asPartial(this.symbolTable);
    }

    vm.invokePartial(block);
  }

  toJSON(): OpcodeJSON {
    return {
      guid: this._guid,
      type: this.type,
      args: ["$OPERAND"]
    };
  }
}
