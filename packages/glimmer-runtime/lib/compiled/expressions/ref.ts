import { CompiledExpression } from '../expressions';
import VM from '../../vm/append';
import { PathReference } from 'glimmer-reference';
import { referenceFromParts } from 'glimmer-reference';

export abstract class CompiledSymbolRef extends CompiledExpression<any> {
  protected debug: string;
  protected symbol: number;
  protected path: string[];

  constructor({ debug, symbol, path }: { debug: string, symbol: number, path: string[] }) {
    super();
    this.debug = debug;
    this.symbol = symbol;
    this.path = path;
  }

  evaluate(vm: VM): PathReference<any> {
    let base = this.referenceForSymbol(vm);
    return referenceFromParts(base, this.path);
  }

  protected abstract referenceForSymbol(vm: VM): PathReference<any>;

  toJSON(): string {
    let { debug, symbol, path } = this;

    if (path.length) {
      return `$${symbol}(${debug}).${path.join('.')}`;
    } else {
      return `$${symbol}(${debug})`;
    }
  }
}

export class CompiledKeywordRef {
  public type = "keyword-ref";
  public name: string;
  public path: string[];

  constructor({ name, path }: { name: string, path: string[] }) {
    this.name = name;
    this.path = path;
  }

  evaluate(vm: VM): PathReference<any> {
    let base = vm.dynamicScope()[<string>this.name] as PathReference<any>;;
    return referenceFromParts(base, this.path);
  }

  toJSON(): string {
    let { name, path } = this;

    if (path.length) {
      return `$KEYWORDS[${name}].${path.join('.')}`;
    } else {
      return `$KEYWORDS[${name}]`;
    }
  }

}

export class CompiledLocalRef extends CompiledSymbolRef {
  public type = "local-ref";

  referenceForSymbol(vm: VM): PathReference<any> {
    return vm.referenceForSymbol(this.symbol);
  }
}

export class CompiledSelfRef extends CompiledExpression<any> {
  public type = "self-ref";
  private parts: string[];

  constructor({ parts }: { parts: string[] }) {
    super();
    this.parts = parts;
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
