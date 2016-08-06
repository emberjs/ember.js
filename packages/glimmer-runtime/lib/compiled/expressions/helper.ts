import { CompiledExpression } from '../expressions';
import { CompiledArgs } from './args';
import VM from '../../vm/append';
import { Helper } from '../../environment';
import { PathReference } from 'glimmer-reference';
import { Opaque } from 'glimmer-util';

export default class CompiledHelper extends CompiledExpression<Opaque> {
  public type = "helper";
  public name: string[];
  public helper: Helper;
  public args: CompiledArgs;

  constructor({ name, helper, args }: { name: string[], helper: Helper, args: CompiledArgs }) {
    super();
    this.name = name;
    this.helper = helper;
    this.args = args;
  }

  evaluate(vm: VM): PathReference<Opaque> {
    let { helper } = this;
    return helper(vm, this.args.evaluate(vm));
  }

  toJSON(): string {
    return `\`${this.name.join('.')}($ARGS)\``;
  }
}
