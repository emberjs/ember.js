import VM from '../../vm/append';
import { CompiledExpression } from '../expressions';
import { ValueReference } from './value';
import { InternedString } from 'glimmer-util';

export default class CompiledHasBlockParams extends CompiledExpression<boolean> {
  public type = "has-block-params";
  public blockName: InternedString;
  public blockSymbol: number;

  constructor({ blockName, blockSymbol }: { blockName: InternedString, blockSymbol: number }) {
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
