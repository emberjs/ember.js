import {
  Reference,
  ReferenceCache,
  Revision,
  Tag,
  VersionedReference,
  isConst,
  isConstTag,
} from '@glimmer/reference';
import { Opaque, Option, destructor } from '@glimmer/util';
import {
  expectStackChange,
  check,
  CheckString,
  CheckElement,
  CheckNode,
  CheckOption,
  CheckInstanceof,
} from '@glimmer/debug';
import { Simple } from '@glimmer/interfaces';
import { Op, Register } from '@glimmer/vm';
import {
  ModifierDefinition,
  InternalModifierManager,
  ModifierInstanceState,
} from '../../modifier/interfaces';
import { APPEND_OPCODES, UpdatingOpcode } from '../../opcodes';
import { UpdatingVM } from '../../vm';
import { Assert } from './vm';
import { DynamicAttribute } from '../../vm/attributes/dynamic';
import { ComponentElementOperations } from './component';
import { CheckReference, CheckArguments } from './-debug-strip';
import { CONSTANTS } from '../../symbols';

APPEND_OPCODES.add(Op.Text, (vm, { op1: text }) => {
  vm.elements().appendText(vm[CONSTANTS].getString(text));
});

APPEND_OPCODES.add(Op.Comment, (vm, { op1: text }) => {
  vm.elements().appendComment(vm[CONSTANTS].getString(text));
});

APPEND_OPCODES.add(Op.OpenElement, (vm, { op1: tag }) => {
  vm.elements().openElement(vm[CONSTANTS].getString(tag));
});

APPEND_OPCODES.add(Op.OpenDynamicElement, vm => {
  let tagName = check(check(vm.stack.pop(), CheckReference).value(), CheckString);
  vm.elements().openElement(tagName);
});

APPEND_OPCODES.add(Op.PushRemoteElement, vm => {
  let elementRef = check(vm.stack.pop(), CheckReference);
  let nextSiblingRef = check(vm.stack.pop(), CheckReference);
  let guidRef = check(vm.stack.pop(), CheckReference);

  let element: Simple.Element;
  let nextSibling: Option<Simple.Node>;
  let guid = guidRef.value() as string;

  if (isConst(elementRef)) {
    element = check(elementRef.value(), CheckElement);
  } else {
    let cache = new ReferenceCache(elementRef as Reference<Simple.Element>);
    element = check(cache.peek(), CheckElement);
    vm.updateWith(new Assert(cache));
  }

  if (isConst(nextSiblingRef)) {
    nextSibling = check(nextSiblingRef.value(), CheckOption(CheckNode));
  } else {
    let cache = new ReferenceCache(nextSiblingRef as Reference<Option<Simple.Node>>);
    nextSibling = check(cache.peek(), CheckOption(CheckNode));
    vm.updateWith(new Assert(cache));
  }

  let block = vm.elements().pushRemoteElement(element, guid, nextSibling);
  if (block) vm.associateDestructor(destructor(block));
});

APPEND_OPCODES.add(Op.PopRemoteElement, vm => {
  vm.elements().popRemoteElement();
});

APPEND_OPCODES.add(Op.FlushElement, vm => {
  let operations = check(
    vm.fetchValue(Register.t0),
    CheckOption(CheckInstanceof(ComponentElementOperations))
  );

  if (operations) {
    operations.flush(vm);
    vm.loadValue(Register.t0, null);
  }

  vm.elements().flushElement();
});

APPEND_OPCODES.add(Op.CloseElement, vm => {
  vm.elements().closeElement();

  expectStackChange(vm.stack, 0, 'CloseElement');
});

APPEND_OPCODES.add(Op.Modifier, (vm, { op1: handle }) => {
  let { manager, state } = vm[CONSTANTS].resolveHandle<ModifierDefinition>(handle);
  let stack = vm.stack;
  let args = check(stack.pop(), CheckArguments);
  let { element, updateOperations } = vm.elements();
  let dynamicScope = vm.dynamicScope();
  let modifier = manager.create(
    element as Simple.FIX_REIFICATION<Element>,
    state,
    args,
    dynamicScope,
    updateOperations
  );

  vm.env.scheduleInstallModifier(modifier, manager);
  let d = manager.getDestructor(modifier);

  if (d) {
    vm.associateDestroyable(d);
  }

  let tag = manager.getTag(modifier);

  if (!isConstTag(tag)) {
    vm.updateWith(new UpdateModifierOpcode(tag, manager, modifier));
  }
});

export class UpdateModifierOpcode extends UpdatingOpcode {
  public type = 'update-modifier';
  private lastUpdated: Revision;

  constructor(
    public tag: Tag,
    private manager: InternalModifierManager,
    private modifier: ModifierInstanceState
  ) {
    super();
    this.lastUpdated = tag.value();
  }

  evaluate(vm: UpdatingVM) {
    let { manager, modifier, tag, lastUpdated } = this;

    if (!tag.validate(lastUpdated)) {
      vm.env.scheduleUpdateModifier(modifier, manager);
      this.lastUpdated = tag.value();
    }
  }
}

APPEND_OPCODES.add(Op.StaticAttr, (vm, { op1: _name, op2: _value, op3: _namespace }) => {
  let name = vm[CONSTANTS].getString(_name);
  let value = vm[CONSTANTS].getString(_value);
  let namespace = _namespace ? vm[CONSTANTS].getString(_namespace) : null;

  vm.elements().setStaticAttribute(name, value, namespace);
});

APPEND_OPCODES.add(Op.DynamicAttr, (vm, { op1: _name, op2: trusting, op3: _namespace }) => {
  let name = vm[CONSTANTS].getString(_name);
  let reference = check(vm.stack.pop(), CheckReference);
  let value = reference.value();
  let namespace = _namespace ? vm[CONSTANTS].getString(_namespace) : null;

  let attribute = vm.elements().setDynamicAttribute(name, value, !!trusting, namespace);

  if (!isConst(reference)) {
    vm.updateWith(new UpdateDynamicAttributeOpcode(reference, attribute));
  }
});

export class UpdateDynamicAttributeOpcode extends UpdatingOpcode {
  public type = 'patch-element';

  public tag: Tag;
  public lastRevision: number;

  constructor(private reference: VersionedReference<Opaque>, private attribute: DynamicAttribute) {
    super();
    this.tag = reference.tag;
    this.lastRevision = this.tag.value();
  }

  evaluate(vm: UpdatingVM) {
    let { attribute, reference, tag } = this;
    if (!tag.validate(this.lastRevision)) {
      this.lastRevision = tag.value();
      attribute.update(reference.value(), vm.env);
    }
  }
}
