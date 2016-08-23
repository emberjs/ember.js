import { PathReference } from 'glimmer-reference';
import { Expression as ExpressionSyntax } from '../../syntax';
import { CompiledExpression } from '../expressions';
import { PublicVM as VM } from '../../vm';
import SymbolTable from '../../symbol-table';

export type FunctionExpression<T> = (VM: VM, symbolTable: SymbolTable) => PathReference<T>;

export default function make<T>(func: FunctionExpression<T>): ExpressionSyntax<T> {
  return new FunctionExpressionSyntax(func);
}

class FunctionExpressionSyntax<T> extends ExpressionSyntax<T> {
  public type = "function-expression";
  private func: FunctionExpression<T>;

  constructor(func: FunctionExpression<T>) {
    super();
    this.func = func;
  }

  compile(lookup, env, symbolTable: SymbolTable): CompiledExpression<T> {
    return new CompiledFunctionExpression(this.func, symbolTable);
  }
}

class CompiledFunctionExpression<T> extends CompiledExpression<T> {
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
