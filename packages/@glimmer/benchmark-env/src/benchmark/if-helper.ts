import { VMArguments, VM } from '@glimmer/interfaces';
import {
  VersionedReference,
  VersionedPathReference,
  CachedReference,
  PathReference,
  PropertyReference,
  TemplateReferenceEnvironment,
} from '@glimmer/reference';
import { createUpdatableTag, UpdatableTag, updateTag, Tag, combine } from '@glimmer/validator';

class IfHelperReference extends CachedReference<unknown> {
  tag: UpdatableTag;
  condition: VersionedReference;
  truthyValue: VersionedReference;
  falsyValue: VersionedReference | undefined;
  env: TemplateReferenceEnvironment;

  constructor({ positional }: VMArguments, env: TemplateReferenceEnvironment) {
    super();
    this.tag = createUpdatableTag();
    this.condition = positional.at(0);
    this.truthyValue = positional.at(1);
    this.falsyValue = positional.length > 2 ? positional.at(2) : undefined;
    this.env = env;
  }

  compute() {
    const { condition, truthyValue, falsyValue } = this;
    let value: unknown;
    let tag: Tag;
    if (condition.value()) {
      value = truthyValue.value();
      tag = combine([condition.tag, truthyValue.tag]);
    } else if (falsyValue !== undefined) {
      value = falsyValue.value();
      tag = combine([condition.tag, falsyValue.tag]);
    } else {
      tag = condition.tag;
    }
    updateTag(this.tag, tag);
    return value;
  }

  get(key: string): PathReference {
    return new PropertyReference(this, key, this.env);
  }
}

export default function ifHelper(args: VMArguments, vm: VM): VersionedPathReference {
  return new IfHelperReference(args, vm.env);
}
