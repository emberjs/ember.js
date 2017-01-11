import { PathReference } from '@glimmer/reference';
import { CompiledExpression } from '../expressions';
import { PublicVM as VM } from '../../vm';
import { SymbolTable } from '@glimmer/interfaces';

export type FunctionExpression<T> = (VM: VM, symbolTable: SymbolTable) => PathReference<T>;

export class CompiledFunctionExpression<T> extends CompiledExpression<T> {
  public type = "function";

  constructor(private func: FunctionExpression<T>, private symbolTable: SymbolTable) {
    super();
    this.func = func;
  }

  evaluate(vm: VM): PathReference<T> {
    let { func, symbolTable } = this;
    return func(vm, symbolTable);
  }

  toJSON(): string {
    let { func } = this;

    if (func.name) {
      return `\`${func.name}(...)\``;
    } else {
      return "`func(...)`";
    }
  }
}
