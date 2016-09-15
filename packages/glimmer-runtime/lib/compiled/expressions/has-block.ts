import VM from '../../vm/append';
import { CompiledExpression } from '../expressions';
import { ValueReference } from './value';

export default class CompiledHasBlock extends CompiledExpression<boolean> {
  public type = "has-block";

  constructor(public blockName: string, public blockSymbol: number) {
    super();
  }

  evaluate(vm: VM): ValueReference<boolean> {
    let blockRef = vm.scope().getBlock(this.blockSymbol);
    return new ValueReference(!!blockRef);
  }

  toJSON(): string {
    return `has-block(${this.blockName})`;
  }
}
