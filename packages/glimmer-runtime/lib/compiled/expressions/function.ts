import { PathReference } from 'glimmer-reference';
import { Expression as ExpressionSyntax } from '../../syntax';
import { CompiledExpression } from '../expressions';
import { PublicVM as VM } from '../../vm';

export type FunctionExpression<T> = (VM) => PathReference<T>;

export default function make<T>(func: FunctionExpression<T>): ExpressionSyntax<T> {
  return new FunctionExpressionSyntax(func);
}

class FunctionExpressionSyntax<T> extends ExpressionSyntax<T> {
  private func: FunctionExpression<T>;

  constructor(func: FunctionExpression<T>) {
    super();
    this.func = func;
  }

  compile(): CompiledExpression<T> {
    return new CompiledFunctionExpression(this.func);
  }
}

class CompiledFunctionExpression<T> extends CompiledExpression<T> {
  type = "function";

  private func: FunctionExpression<T>;

  constructor(func: FunctionExpression<T>) {
    super();
    this.func = func;
  }

  evaluate(vm: VM): PathReference<T> {
    let { func } = this;
    return func(vm);
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
