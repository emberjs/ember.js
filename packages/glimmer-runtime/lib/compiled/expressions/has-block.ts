import { PathReference } from 'glimmer-reference';
import VM from '../../vm/append';
import { CompiledExpression } from '../expressions';
import { PrimitiveReference } from '../../references';

export default class CompiledHasBlock extends CompiledExpression<boolean> {
  public type = "has-block";

  constructor(private blockName: string, private blockSymbol: number) {
    super();
  }

  evaluate(vm: VM): PathReference<boolean> {
    let block = vm.scope().getBlock(this.blockSymbol);
    return PrimitiveReference.create(!!block);
  }

  toJSON(): string {
    return `has-block(${this.blockName})`;
  }
}

export class CompiledPartialHasBlock extends CompiledExpression<boolean> {
  public type = "has-block";

  constructor(private blockName: string, private partialArgsSymbol: number) {
    super();
  }

  evaluate(vm: VM): PathReference<boolean> {
    let { blockName, partialArgsSymbol } = this;
    let args = vm.scope().getPartialArgs(partialArgsSymbol);
    return PrimitiveReference.create(!!args.templates[blockName]);
  }

  toJSON(): string {
    return `has-block(${this.blockName})`;
  }
}
