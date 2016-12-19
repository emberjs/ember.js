import { Opcode, OpcodeJSON } from '../../opcodes';
import { CompiledGetBlock } from '../expressions/has-block';
import { CompiledArgs } from '../expressions/args';
import { VM } from '../../vm';

export class OpenBlockOpcode extends Opcode {
  type = "open-block";

  constructor(
    private inner: CompiledGetBlock,
    private args: CompiledArgs
  ) {
    super();
  }

  evaluate(vm: VM) {
    let block = this.inner.evaluate(vm);
    let args;

    if (block) {
      args = this.args.evaluate(vm);
    }

    // FIXME: can we avoid doing this when we don't have a block?
    vm.pushCallerScope();

    if (block) {
      vm.invokeBlock(block, args);
    }
  }

  toJSON(): OpcodeJSON {
    return {
      guid: this._guid,
      type: this.type,
      details: {
        "block": this.inner.toJSON(),
        "positional": this.args.positional.toJSON(),
        "named": this.args.named.toJSON()
      }
    };
  }
}

export class CloseBlockOpcode extends Opcode {
  public type = "close-block";

  evaluate(vm: VM) {
    vm.popScope();
  }
}