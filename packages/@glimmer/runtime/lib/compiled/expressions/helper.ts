import { CompiledExpression } from '../expressions';
import { CompiledArgs } from './args';
import VM from '../../vm/append';
import { Helper } from '../../environment';
import { SymbolTable } from 'glimmer-interfaces';
import { PathReference } from 'glimmer-reference';
import { Opaque, Option } from 'glimmer-util';

export default class CompiledHelper extends CompiledExpression<Opaque> {
  public type = "helper";

  constructor(public name: Option<string>[], public helper: Helper, public args: CompiledArgs, public symbolTable: SymbolTable) {
    super();
  }

  evaluate(vm: VM): PathReference<Opaque> {
    let { helper } = this;
    return helper(vm, this.args.evaluate(vm), this.symbolTable);
  }

  toJSON(): string {
    return `\`${this.name.join('.')}($ARGS)\``;
  }
}
