import { CompiledExpression } from '../expressions';
import { CompiledArgs, EvaluatedArgs } from './args';
import VM from '../../vm';
import { Helper } from '../../environment';
import { InternedString } from 'glimmer-util';
import { PathReference, referenceFromParts } from 'glimmer-reference';

export default class CompiledHelper implements CompiledExpression {
  public type = "helper";
  public helper: Helper;
  public args: CompiledArgs;

  constructor({ helper, args }: { helper: Helper, args: CompiledArgs }) {
    this.helper = helper;
    this.args = args;
  }

  evaluate(vm: VM): PathReference {
    return new HelperInvocationReference(this.helper, this.args.evaluate(vm));
  }
}

class HelperInvocationReference implements PathReference {
  private helper: Helper;
  private args: EvaluatedArgs;

  constructor(helper: Helper, args: EvaluatedArgs) {
    this.helper = helper;
    this.args = args;
  }

  get(): PathReference {
    throw new Error("Unimplemented: Yielding the result of a helper call.");
  }

  isDirty() {
    return true;
  }

  value(): any {
    let { helper, args: { positional, named } }  = this;
    return this.helper.call(undefined, positional.value(), named.value(), null);
  }

  destroy() {}
}
