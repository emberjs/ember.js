import { isConst, Reference, Tag, VersionedReference } from '@glimmer/reference';
import { Op, Register } from '@glimmer/vm';
import { check, expectStackChange } from '@glimmer/debug';
import { Opaque } from '@glimmer/util';

import { DynamicContentWrapper } from '../../vm/content/dynamic';
import { APPEND_OPCODES, UpdatingOpcode } from '../../opcodes';
import { UpdatingVM } from '../../vm';
import { ConditionalReference } from '../../references';
import { isCurriedComponentDefinition } from '../../component/curried-component';
import { CheckPathReference } from './-debug-strip';

export class IsCurriedComponentDefinitionReference extends ConditionalReference {
  static create(inner: Reference<Opaque>): IsCurriedComponentDefinitionReference {
    return new IsCurriedComponentDefinitionReference(inner);
  }

  toBool(value: Opaque): boolean {
    return isCurriedComponentDefinition(value);
  }
}

APPEND_OPCODES.add(Op.DynamicContent, (vm) => {
  let reference = check(vm.stack.pop(), CheckPathReference);
  let isTrusting = vm.fetchValue(Register.t0);

  let value = reference.value();
  let content: DynamicContentWrapper;

  if (isTrusting) {
    content = vm.elements().appendTrustingDynamicContent(value);
  } else {
    content = vm.elements().appendCautiousDynamicContent(value);
  }

  if (!isConst(reference)) {
    vm.updateWith(new UpdateDynamicContentOpcode(reference, content));
  }

  vm.loadValue(Register.t0, null);
  expectStackChange(vm.stack, -1, 'DynamicContent');
});

class UpdateDynamicContentOpcode extends UpdatingOpcode {
  public tag: Tag;

  constructor(private reference: VersionedReference<Opaque>, private content: DynamicContentWrapper) {
    super();
    this.tag = reference.tag;
  }

  evaluate(vm: UpdatingVM): void {
    let { content, reference } = this;
    content.update(vm.env, reference.value());
  }
}
