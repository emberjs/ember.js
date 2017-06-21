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
import { Simple } from '@glimmer/interfaces';
import { Op, Register } from '@glimmer/vm';
import { Modifier, ModifierManager } from '../../modifier/interfaces';
import { APPEND_OPCODES, OpcodeJSON, UpdatingOpcode } from '../../opcodes';
import { UpdatingVM } from '../../vm';
import { Arguments } from '../../vm/arguments';
import { Assert } from './vm';
import { DynamicAttribute } from '../../vm/attributes/dynamic';
import { ComponentElementOperations } from './component';

APPEND_OPCODES.add(Op.Text, (vm, { op1: text }) => {
  vm.elements().appendText(vm.constants.getString(text));
});

APPEND_OPCODES.add(Op.Comment, (vm, { op1: text }) => {
  vm.elements().appendComment(vm.constants.getString(text));
});

APPEND_OPCODES.add(Op.OpenElement, (vm, { op1: tag }) => {
  vm.elements().openElement(vm.constants.getString(tag));
});

APPEND_OPCODES.add(Op.OpenElementWithOperations, (vm, { op1: tag }) => {
  let tagName = vm.constants.getString(tag);
  vm.elements().openElement(tagName);
});

APPEND_OPCODES.add(Op.OpenDynamicElement, vm => {
  let tagName = vm.stack.pop<Reference<string>>().value();
  vm.elements().openElement(tagName);
});

APPEND_OPCODES.add(Op.PushRemoteElement, vm => {
  let elementRef = vm.stack.pop<Reference<Simple.Element>>();
  let nextSiblingRef = vm.stack.pop<Reference<Option<Simple.Node>>>();

  let element: Simple.Element;
  let nextSibling: Option<Simple.Node>;

  if (isConst(elementRef)) {
    element = elementRef.value();
  } else {
    let cache = new ReferenceCache(elementRef);
    element = cache.peek();
    vm.updateWith(new Assert(cache));
  }

  if (isConst(nextSiblingRef)) {
    nextSibling = nextSiblingRef.value();
  } else {
    let cache = new ReferenceCache(nextSiblingRef);
    nextSibling = cache.peek();
    vm.updateWith(new Assert(cache));
  }

  vm.elements().pushRemoteElement(element, nextSibling);
});

APPEND_OPCODES.add(Op.PopRemoteElement, vm => vm.elements().popRemoteElement());

APPEND_OPCODES.add(Op.FlushElement, vm => {
  let operations = vm.fetchValue<ComponentElementOperations>(Register.t0);

  if (operations) {
    operations.flush(vm);
    vm.loadValue(Register.t0, null);
  }

  vm.elements().flushElement();
});

APPEND_OPCODES.add(Op.CloseElement, vm => vm.elements().closeElement());

APPEND_OPCODES.add(Op.Modifier, (vm, { op1: specifier }) => {
  let manager = vm.constants.resolveSpecifier<ModifierManager>(specifier);
  let stack = vm.stack;
  let args = stack.pop<Arguments>();
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

  toJSON(): OpcodeJSON {
    return {
      guid: this._guid,
      type: this.type,
    };
  }
}

// APPEND_OPCODES.add(Op.ComponentAttr, )

APPEND_OPCODES.add(Op.StaticAttr, (vm, { op1: _name, op2: _value, op3: _namespace }) => {
  let name = vm.constants.getString(_name);
  let value = vm.constants.getString(_value);
  let namespace = _namespace ? vm.constants.getString(_namespace) : null;

  vm.elements().setStaticAttribute(name, value, namespace);
});

APPEND_OPCODES.add(Op.DynamicAttr, (vm, { op1: _name, op2: trusting, op3: _namespace }) => {
  let name = vm.constants.getString(_name);
  let reference = vm.stack.pop<VersionedReference<Opaque>>();
  let value = reference.value();
  let namespace = _namespace ? vm.constants.getString(_namespace) : null;

  let attribute = vm.elements().setDynamicAttribute(name, value, !!trusting, namespace);

  if (!isConst(reference)) {
    vm.updateWith(new UpdateDynamicAttributeOpcode(reference, attribute));
  }
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
