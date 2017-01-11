import { Opaque } from '@glimmer/util';
import { CompiledExpression } from '../expressions';
import VM from '../../vm/append';
import { PathReference } from '@glimmer/reference';
import { referenceFromParts } from '@glimmer/reference';

export default class CompiledLookup extends CompiledExpression<Opaque> {
  public type = "lookup";

  static create(base: CompiledExpression<Opaque>, path: string[]): CompiledExpression<Opaque> {
    if (path.length === 0) {
      return base;
    } else {
      return new this(base, path);
    }
  }

  private constructor(
    private base: CompiledExpression<Opaque>,
    private path: string[]
  ) {
    super();
  }

  evaluate(vm: VM): PathReference<Opaque> {
    let { base, path } = this;
    return referenceFromParts(base.evaluate(vm), path);
  }

  toJSON(): string {
    return `${this.base.toJSON()}.${this.path.join('.')}`;
  }
}

export class CompiledSelf extends CompiledExpression<Opaque> {
  evaluate(vm: VM): PathReference<Opaque> {
    return vm.getSelf();
  }

  toJSON(): string {
    return 'self';
  }
}

export class CompiledSymbol extends CompiledExpression<Opaque> {
  constructor(private symbol: number, private debug: string) {
    super();
  }

  evaluate(vm: VM): PathReference<Opaque> {
    return vm.referenceForSymbol(this.symbol);
  }

  toJSON(): string {
    return `$${this.symbol}(${this.debug})`;
  }
}

export class CompiledInPartialName extends CompiledExpression<Opaque> {
  constructor(private symbol: number, private name: string) {
    super();
  }

  evaluate(vm: VM): PathReference<Opaque> {
    let { symbol, name } = this;
    let args = vm.scope().getPartialArgs(symbol);
    return args.named.get(name);
  }

  toJSON(): string {
    return `$${this.symbol}($ARGS).${this.name}`;
  }
}
