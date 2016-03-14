import { CompiledExpression } from '../expressions';
import { CompiledArgs } from './args';
import VM from '../../vm/append';
import { Helper } from '../../environment';
import { PathReference } from 'glimmer-reference';
import { Opaque } from 'glimmer-util';

export default class CompiledHelper<T> extends CompiledExpression<Opaque> {
  public type = "helper";
  public helper: Helper;
  public args: CompiledArgs;

  constructor({ helper, args }: { helper: Helper, args: CompiledArgs }) {
    super();
    this.helper = helper;
    this.args = args;
  }

  evaluate(vm: VM): PathReference<T> {
    return this.helper.call(undefined, this.args.evaluate(vm));
  }
}
