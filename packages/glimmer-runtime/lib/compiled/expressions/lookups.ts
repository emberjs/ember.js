import { CompiledExpression } from '../expressions';
import VM from '../../vm/append';
import { PathReference } from 'glimmer-reference';
import { referenceFromParts } from 'glimmer-reference';

export class CompiledLocalLookup extends CompiledExpression<any> {
  public type = "local-lookup";

  constructor(
    private symbol: number,
    private path: string[],
    private debug: string
  ) {
    super();
  }

  evaluate(vm: VM): PathReference<any> {
    let { symbol, path } = this;
    let base = vm.referenceForSymbol(symbol);
    return referenceFromParts(base, path);
  }

  toJSON(): string {
    let { debug, symbol, path } = this;

    if (path.length) {
      return `$${symbol}(${debug}).${path.join('.')}`;
    } else {
      return `$${symbol}(${debug})`;
    }
  }
}

export class CompiledPartialLocalLookup extends CompiledExpression<any> {
  public type = "partial-local-lookup";

  constructor(
    private symbol: number,
    private name: string,
    private path: string[],
  ) {
    super();
  }

  evaluate(vm: VM): PathReference<any> {
    let { symbol, name, path } = this;
    let args = vm.scope().getPartialArgs(symbol);
    let base = args.named.get(name);
    return referenceFromParts(base, path);
  }

  toJSON(): string {
    let { symbol, name, path } = this;

    if (path.length) {
      return `$${symbol}(ARGS).@${name}.${path.join('.')}`;
    } else {
      return `$${symbol}(ARGS).@${name}`;
    }
  }
}

export class CompiledSelfLookup extends CompiledExpression<any> {
  public type = "self-lookup";

  constructor(private parts: string[]) {
    super();
  }

  evaluate(vm: VM): PathReference<any> {
    return referenceFromParts(vm.getSelf(), this.parts);
  }

  toJSON(): string {
    let path = ['self'];
    path.push(...this.parts);
    return path.join('.');
  }
}
