import { PathReference } from 'glimmer-reference';
import VM from '../../vm/append';
import { CompiledExpression } from '../expressions';
import { PrimitiveReference } from '../../references';

export default class CompiledHasBlockParams extends CompiledExpression<boolean> {
  public type = "has-block-params";

  constructor(public blockName: string, public blockSymbol: number) {
    super();
  }

  evaluate(vm: VM): PathReference<boolean> {
    let blockRef = vm.scope().getBlock(this.blockSymbol);
    return PrimitiveReference.create(!!(blockRef && blockRef.locals.length > 0));
  }

  toJSON(): string {
    return `has-block-params(${this.blockName})`;
  }
}
