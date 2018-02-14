import { isConst, Reference, Tag, VersionedReference } from '@glimmer/reference';
import { Op, Register } from '@glimmer/vm';
import { check } from '@glimmer/debug';
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

APPEND_OPCODES.add(Op.CautiousDynamicContent, (vm) => {
  let reference = check(vm.stack.pop(), CheckPathReference);

  let value = reference.value();
  let content: DynamicContentWrapper;

  content = vm.elements().appendCautiousDynamicContent(value);

  if (!isConst(reference)) {
    vm.updateWith(new UpdateDynamicContentOpcode(reference, content));
  }
});

APPEND_OPCODES.add(Op.TrustingDynamicContent, (vm) => {
  let reference = check(vm.stack.pop(), CheckPathReference);

  let value = reference.value();
  let content: DynamicContentWrapper;

  content = vm.elements().appendTrustingDynamicContent(value);

  if (!isConst(reference)) {
    vm.updateWith(new UpdateDynamicContentOpcode(reference, content));
  }

  vm.loadValue(Register.t0, null);
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
