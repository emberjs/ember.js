import VM from '../vm/append';
import { PathReference } from 'glimmer-reference';

export abstract class CompiledExpression<T> {
  type: string;
  abstract evaluate(vm: VM): PathReference<T>;

  toJSON(): string {
    return `UNIMPL: ${this.type.toUpperCase()}`;
  }
}
