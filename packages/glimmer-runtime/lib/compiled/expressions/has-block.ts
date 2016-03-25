import VM from '../../vm/append';
import { CompiledExpression } from '../expressions';
import { ValueReference } from './value';
import { InternedString } from 'glimmer-util';

export default class CompiledHasBlock extends CompiledExpression<boolean> {
  public type = "has-block";
  public blockName: InternedString;
  public blockSymbol: number;

  constructor({ blockName, blockSymbol }: { blockName: InternedString, blockSymbol: number }) {
    super();
    this.blockName = blockName;
    this.blockSymbol = blockSymbol;
  }

  evaluate(vm: VM): ValueReference<boolean> {
    let blockRef = vm.referenceForSymbol(this.blockSymbol);
    return new ValueReference(!!blockRef);
  }

  toJSON(): string {
    return `has-block(${this.blockName})`;
  }
}
