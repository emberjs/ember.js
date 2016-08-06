import VM from '../../vm/append';
import { CompiledExpression } from '../expressions';
import { ValueReference } from './value';

export default class CompiledHasBlockParams extends CompiledExpression<boolean> {
  public type = "has-block-params";
  public blockName: string;
  public blockSymbol: number;

  constructor({ blockName, blockSymbol }: { blockName: string, blockSymbol: number }) {
    super();
    this.blockName = blockName;
    this.blockSymbol = blockSymbol;
  }

  evaluate(vm: VM): ValueReference<boolean> {
    let blockRef = vm.scope().getBlock(this.blockSymbol);
    return new ValueReference(!!(blockRef && blockRef.locals.length > 0));
  }

  toJSON(): string {
    return `has-block-params(${this.blockName})`;
  }
}
