import { CompiledExpression } from '../expressions';
import VM from '../../vm/append';
import { InternedString } from 'glimmer-util';
import { PathReference } from 'glimmer-reference';
import { referenceFromParts } from 'glimmer-reference';

export abstract class CompiledSymbolRef extends CompiledExpression<any> {
  protected debug: string;
  protected symbol: number;
  protected path: InternedString[];

  constructor({ debug, symbol, path }: { debug: string, symbol: number, path: InternedString[] }) {
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
  public name: InternedString;
  public path: InternedString[];

  constructor({ name, path }: { name: InternedString, path: InternedString[] }) {
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
  private parts: InternedString[];

  constructor({ parts }: { parts: InternedString[] }) {
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
