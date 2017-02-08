import { PathReference } from '@glimmer/reference';
import { Option } from '@glimmer/util';
import VM from '../../vm/append';
import { Block } from '../../scanner';
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
    let hasLocals = block && block.symbolTable.getSymbols().locals;
    return PrimitiveReference.create(!!hasLocals);
  }

  toJSON(): string {
    return `has-block-params(${this.inner.toJSON()})`;
  }
}

export interface CompiledGetBlock {
  evaluate(vm: VM): Option<Block>;
  toJSON(): string;
}

export class CompiledGetBlockBySymbol implements CompiledGetBlock {
  constructor(private symbol: number, private debug: string) {
  }

  evaluate(vm: VM): Block {
    return vm.scope().getBlock(this.symbol);
  }

  toJSON(): string {
    return `get-block($${this.symbol}(${this.debug}))`;
  }
}

export class CompiledInPartialGetBlock implements CompiledGetBlock {
  constructor(private symbol: number, private name: string) {
  }

  evaluate(vm: VM): Block {
    let { symbol, name } = this;
    let args = vm.scope().getPartialArgs(symbol);
    return args.blocks[name];
  }

  toJSON(): string {
    return `get-block($${this.symbol}($ARGS).${this.name}))`;
  }
}
