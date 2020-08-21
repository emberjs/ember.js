import { VMArguments, VM } from '@glimmer/interfaces';
import {
  Reference,
  PathReference,
  CachedReference,
  PropertyReference,
  TemplateReferenceEnvironment,
} from '@glimmer/reference';

class IfHelperReference extends CachedReference<unknown> {
  condition: Reference;
  truthyValue: Reference;
  falsyValue: Reference | undefined;
  env: TemplateReferenceEnvironment;

  constructor({ positional }: VMArguments, env: TemplateReferenceEnvironment) {
    super();
    this.condition = positional.at(0);
    this.truthyValue = positional.at(1);
    this.falsyValue = positional.length > 2 ? positional.at(2) : undefined;
    this.env = env;
  }

  compute() {
    const { condition, truthyValue, falsyValue } = this;
    let value: unknown;
    if (condition.value()) {
      value = truthyValue.value();
    } else if (falsyValue !== undefined) {
      value = falsyValue.value();
    }
    return value;
  }

  get(key: string): PathReference {
    return new PropertyReference(this, key, this.env);
  }
}

export default function ifHelper(args: VMArguments, vm: VM): PathReference {
  return new IfHelperReference(args, vm.env);
}
