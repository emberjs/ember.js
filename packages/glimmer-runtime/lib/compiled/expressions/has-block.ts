import { PathReference } from 'glimmer-reference';
import VM from '../../vm/append';
import { CompiledExpression } from '../expressions';
import { PrimitiveReference } from '../../references';

export default class CompiledHasBlock extends CompiledExpression<boolean> {
  public type = "has-block";

  constructor(public blockName: string, public blockSymbol: number) {
    super();
  }

  evaluate(vm: VM): PathReference<boolean> {
    let blockRef = vm.scope().getBlock(this.blockSymbol);
    return PrimitiveReference.create(!!blockRef);
  }

  toJSON(): string {
    return `has-block(${this.blockName})`;
  }
}
