import { Opcode, ExpressionSyntax } from '../opcodes';
import { VM } from '../vm';
import { ParamsAndHash as Args } from '../template';

export class ArgsOpcode implements Opcode {
  public type = "expression";
  public next = null;
  public prev = null;

  private syntax: Args;

  constructor(syntax: Args) {
    this.syntax = syntax;
  }

  evaluate(vm: VM<any>) {
    vm.evaluateArgs(this.syntax);
  }
}