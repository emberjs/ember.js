import {
  Reference,
  ReferenceCache,
  Revision,
  Tag,
  VersionedReference,
  isConst,
  isConstTag
} from '@glimmer/reference';
import { Opaque, Option } from '@glimmer/util';
import { expectStackChange, check, CheckString, CheckElement, CheckNode, CheckOption, CheckInstanceof } from '@glimmer/debug';
import { Simple } from '@glimmer/interfaces';
import { Op, Register } from '@glimmer/vm';
import { Modifier, ModifierManager } from '../../modifier/interfaces';
import { APPEND_OPCODES, UpdatingOpcode } from '../../opcodes';
import { UpdatingVM } from '../../vm';
import { Assert } from './vm';
import { DynamicAttribute } from '../../vm/attributes/dynamic';
import { ComponentElementOperations } from './component';
import { CheckReference, CheckArguments } from './debug';

APPEND_OPCODES.add(Op.Text, (vm, { op1: text }) => {
  vm.elements().appendText(vm.constants.getString(text));

  expectStackChange(vm.stack, 0, 'Text');
});

APPEND_OPCODES.add(Op.OpenElementWithOperations, (vm, { op1: tag }) => {
  let tagName = vm.constants.getString(tag);
  vm.elements().openElement(tagName);

  expectStackChange(vm.stack, 0, 'OpenElementWithOperations');
});

APPEND_OPCODES.add(Op.Comment, (vm, { op1: text }) => {
  vm.elements().appendComment(vm.constants.getString(text));

  expectStackChange(vm.stack, 0, 'Comment');
});

APPEND_OPCODES.add(Op.OpenElement, (vm, { op1: tag }) => {
  vm.elements().openElement(vm.constants.getString(tag));

  expectStackChange(vm.stack, 0, 'OpenElement');
});

APPEND_OPCODES.add(Op.OpenDynamicElement, vm => {
  let tagName = check(check(vm.stack.pop(), CheckReference).value(), CheckString);
  vm.elements().openElement(tagName);

  expectStackChange(vm.stack, -1, 'OpenDynamicElement');
});

APPEND_OPCODES.add(Op.PushRemoteElement, vm => {
  let elementRef = check(vm.stack.pop(), CheckReference);
  let nextSiblingRef = check(vm.stack.pop(), CheckReference);

  let element: Simple.Element;
  let nextSibling: Option<Simple.Node>;

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

  vm.elements().pushRemoteElement(element, nextSibling);

  expectStackChange(vm.stack, -2, 'PushRemoteElement');
});

APPEND_OPCODES.add(Op.PopRemoteElement, vm => {
  vm.elements().popRemoteElement();

  expectStackChange(vm.stack, 0, 'PopRemoteElement');
});

APPEND_OPCODES.add(Op.FlushElement, vm => {
  let operations = check(vm.fetchValue(Register.t0), CheckOption(CheckInstanceof(ComponentElementOperations)));

  if (operations) {
    operations.flush(vm);
    vm.loadValue(Register.t0, null);
  }

  vm.elements().flushElement();

  expectStackChange(vm.stack, 0, 'FlushElement');
});

APPEND_OPCODES.add(Op.CloseElement, vm => {
  vm.elements().closeElement();

  expectStackChange(vm.stack, 0, 'CloseElement');
});

APPEND_OPCODES.add(Op.Modifier, (vm, { op1: handle }) => {
  let manager = vm.constants.resolveHandle<ModifierManager>(handle);
  let stack = vm.stack;
  let args = check(stack.pop(), CheckArguments);
  let { constructing: element, updateOperations } = vm.elements();
  let dynamicScope = vm.dynamicScope();
  let modifier = manager.create(element as Simple.FIX_REIFICATION<Element>, args, dynamicScope, updateOperations);

  args.clear();

  vm.env.scheduleInstallModifier(modifier, manager);
  let destructor = manager.getDestructor(modifier);

  if (destructor) {
    vm.newDestroyable(destructor);
  }

  let tag = manager.getTag(modifier);

  if (!isConstTag(tag)) {
    vm.updateWith(new UpdateModifierOpcode(
      tag,
      manager,
      modifier
    ));
  }
});

export class UpdateModifierOpcode extends UpdatingOpcode {
  public type = 'update-modifier';
  private lastUpdated: Revision;

  constructor(
    public tag: Tag,
    private manager: ModifierManager,
    private modifier: Modifier,
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
  let name = vm.constants.getString(_name);
  let value = vm.constants.getString(_value);
  let namespace = _namespace ? vm.constants.getString(_namespace) : null;

  vm.elements().setStaticAttribute(name, value, namespace);

  expectStackChange(vm.stack, 0, 'StaticAttr');
});

APPEND_OPCODES.add(Op.DynamicAttr, (vm, { op1: _name, op2: trusting, op3: _namespace }) => {
  let name = vm.constants.getString(_name);
  let reference = check(vm.stack.pop(), CheckReference);
  let value = reference.value();
  let namespace = _namespace ? vm.constants.getString(_namespace) : null;

  let attribute = vm.elements().setDynamicAttribute(name, value, !!trusting, namespace);

  if (!isConst(reference)) {
    vm.updateWith(new UpdateDynamicAttributeOpcode(reference, attribute));
  }

  expectStackChange(vm.stack, -1, 'DynamicAttr');
});

export class UpdateDynamicAttributeOpcode extends UpdatingOpcode {
  public type = 'patch-element';

  public tag: Tag;

  constructor(private reference: VersionedReference<Opaque>, private attribute: DynamicAttribute) {
    super();
    this.tag = reference.tag;
  }

  evaluate(vm: UpdatingVM) {
    let { attribute, reference } = this;
    attribute.update(reference.value(), vm.env);
  }
}
