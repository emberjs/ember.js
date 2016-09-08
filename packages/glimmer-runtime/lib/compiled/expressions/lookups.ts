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
    let base = vm.referenceForSymbol(this.symbol);
    return referenceFromParts(base, this.path);
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
