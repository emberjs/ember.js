import { PathReference } from 'glimmer-reference';
import VM from '../../vm/append';
import { CompiledExpression } from '../expressions';
import { PrimitiveReference } from '../../references';

export default class CompiledHasBlockParams extends CompiledExpression<boolean> {
  public type = "has-block-params";

  constructor(private blockName: string, private blockSymbol: number) {
    super();
  }

  evaluate(vm: VM): PathReference<boolean> {
    let block = vm.scope().getBlock(this.blockSymbol);
    return PrimitiveReference.create(!!(block && block.locals.length > 0));
  }

  toJSON(): string {
    return `has-block-params(${this.blockName})`;
  }
}

export class CompiledPartialHasBlockParams extends CompiledExpression<boolean> {
  public type = "has-block-params";

  constructor(private blockName: string, private partialArgsSymbol: number) {
    super();
  }

  evaluate(vm: VM): PathReference<boolean> {
    let { blockName, partialArgsSymbol } = this;
    let args = vm.scope().getPartialArgs(partialArgsSymbol);
    let block = args.templates[blockName];
    return PrimitiveReference.create(!!(block && block.locals.length > 0));
  }

  toJSON(): string {
    return `has-block-params(${this.blockName})`;
  }
}
