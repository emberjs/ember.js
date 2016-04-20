import { CompiledExpression } from '../expressions';
import { CompiledArgs } from './args';
import VM from '../../vm/append';
import { Helper, Insertion } from '../../environment';
import { PathReference } from 'glimmer-reference';
import { InternedString } from 'glimmer-util';

export default class CompiledHelper extends CompiledExpression<Insertion> {
  public type = "helper";
  public name: InternedString[];
  public helper: Helper;
  public args: CompiledArgs;

  constructor({ name, helper, args }: { name: InternedString[], helper: Helper, args: CompiledArgs }) {
    super();
    this.name = name;
    this.helper = helper;
    this.args = args;
  }

  evaluate(vm: VM): PathReference<Insertion> {
    return this.helper.call(undefined, this.args.evaluate(vm));
  }

  toJSON(): string {
    return `\`${this.name.join('.')}($ARGS)\``;
  }
}
