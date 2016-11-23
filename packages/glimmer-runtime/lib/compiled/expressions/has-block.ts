import { PathReference } from 'glimmer-reference';
import VM from '../../vm/append';
import { InlineBlock } from '../blocks';
import { CompiledExpression } from '../expressions';
import { PrimitiveReference } from '../../references';

export default class CompiledHasBlock extends CompiledExpression<boolean> {
  public type = "has-block";

  constructor(private inner: CompiledGetBlock) {
    super();
  }

  evaluate(vm: VM): PathReference<boolean> {
    let block = this.inner.evaluate(vm);
    return PrimitiveReference.create(!!block);
  }

  toJSON(): string {
    return `has-block(${this.inner.toJSON()})`;
  }
}

export class CompiledHasBlockParams extends CompiledExpression<boolean> {
  public type = "has-block-params";

  constructor(private inner: CompiledGetBlock) {
    super();
  }

  evaluate(vm: VM): PathReference<boolean> {
    let block = this.inner.evaluate(vm);
    return PrimitiveReference.create(!!(block && block.locals.length > 0));
  }

  toJSON(): string {
    return `has-block-params(${this.inner.toJSON()})`;
  }
}

export interface CompiledGetBlock {
  evaluate(vm: VM): InlineBlock;
  toJSON(): string;
}

export class CompiledGetBlockBySymbol implements CompiledGetBlock {
  constructor(private symbol: number, private debug: string) {
  }

  evaluate(vm: VM): InlineBlock {
    return vm.scope().getBlock(this.symbol);
  }

  toJSON(): string {
    return `get-block($${this.symbol}(${this.debug}))`;
  }
}

export class CompiledInPartialGetBlock implements CompiledGetBlock {
  constructor(private symbol: number, private name: string) {
  }

  evaluate(vm: VM): InlineBlock {
    let { symbol, name } = this;
    let args = vm.scope().getPartialArgs(symbol);
    return args.templates[name];
  }

  toJSON(): string {
    return `get-block($${this.symbol}($ARGS).${this.name}))`;
  }
}
