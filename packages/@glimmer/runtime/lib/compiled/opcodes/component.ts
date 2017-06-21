import { normalizeStringValue } from '../../dom/normalize';
import { UpdateDynamicAttributeOpcode } from './dom';
import { Opaque, Option } from '@glimmer/interfaces';
import {
  combine,
  combineTagged,
  CONSTANT_TAG,
  isConst,
  ReferenceCache,
  Tag,
  VersionedReference,
  VersionedPathReference,
} from '@glimmer/reference';
import Bounds from '../../bounds';
import { Component, ComponentDefinition, ComponentManager } from '../../component/interfaces';
import { DynamicScope } from '../../environment';
import { APPEND_OPCODES, Op, OpcodeJSON, UpdatingOpcode, Register } from '../../opcodes';
import { UpdatingVM, VM } from '../../vm';
import ARGS, { Arguments, IArguments } from '../../vm/arguments';
import { Assert } from './vm';
import { dict } from "@glimmer/util";

APPEND_OPCODES.add(Op.PushComponentManager, (vm, { op1: _definition }) => {
  let definition = vm.constants.getOther<ComponentDefinition<Opaque>>(_definition);
  let stack = vm.stack;

  stack.push({ definition, manager: definition.manager, component: null });
});

APPEND_OPCODES.add(Op.PushDynamicComponentManager, vm => {
  let stack = vm.stack;
  let reference = stack.pop<VersionedPathReference<ComponentDefinition<Opaque>>>();
  let cache = isConst(reference) ? undefined : new ReferenceCache<ComponentDefinition<Opaque>>(reference);
  let definition = cache ? cache.peek() : reference.value();

  stack.push({ definition, manager: definition.manager, component: null });

  if (cache) {
    vm.updateWith(new Assert(cache));
  }
});

interface InitialComponentState<T> {
  definition: ComponentDefinition<T>;
  manager: ComponentManager<T>;
  component: null;
}

export interface ComponentState<T> {
  definition: ComponentDefinition<T>;
  manager: ComponentManager<T>;
  component: T;
}

APPEND_OPCODES.add(Op.PushArgs, (vm, { op1: synthetic }) => {
  let stack = vm.stack;
  ARGS.setup(stack, !!synthetic);
  stack.push(ARGS);
});

APPEND_OPCODES.add(Op.PrepareArgs, (vm, { op1: _state }) => {
  let stack = vm.stack;
  let { definition, manager } = vm.fetchValue<InitialComponentState<Opaque>>(_state);
  let args = stack.pop<Arguments>();

  let preparedArgs = manager.prepareArgs(definition, args);

  if (preparedArgs) {
    args.clear();

    let { positional, named } = preparedArgs;

    let positionalCount = positional.length;

    for (let i = 0; i < positionalCount; i++) {
      stack.push(positional[i]);
    }

    stack.push(positionalCount);

    let names = Object.keys(named);
    let namedCount = names.length;
    let atNames = [];

    for (let i = 0; i < namedCount; i++) {
      let value = named[names[i]];
      let atName = `@${names[i]}`;

      stack.push(value);
      atNames.push(atName);
    }

    stack.push(atNames);
    args.setup(stack, false);
  }

  stack.push(args);
});

APPEND_OPCODES.add(Op.CreateComponent, (vm, { op1: flags, op2: _state }) => {
  let definition: ComponentDefinition<Opaque>;
  let manager: ComponentManager<Opaque>;
  let args = vm.stack.pop<IArguments>();
  let dynamicScope = vm.dynamicScope();
  let state = { definition, manager } = vm.fetchValue<InitialComponentState<Opaque>>(_state);

  let hasDefaultBlock = flags & 1;

  let component = manager.create(vm.env, definition, args, dynamicScope, vm.getSelf(), !!hasDefaultBlock);
  (state as ComponentState<typeof component>).component = component;

  vm.updateWith(new UpdateComponentOpcode(args.tag, definition.name, component, manager, dynamicScope));
});

APPEND_OPCODES.add(Op.RegisterComponentDestructor, (vm, { op1: _state }) => {
  let { manager, component } = vm.fetchValue<ComponentState<Opaque>>(_state);

  let destructor = manager.getDestructor(component);
  if (destructor) vm.newDestroyable(destructor);
});

APPEND_OPCODES.add(Op.BeginComponentTransaction, vm => {
  vm.beginCacheGroup();
  vm.elements().pushSimpleBlock();
});

APPEND_OPCODES.add(Op.PutComponentOperations, vm => {
  vm.loadValue(Register.t0, new ComponentElementOperations());
});

APPEND_OPCODES.add(Op.ComponentAttr, (vm, { op1: _name, op2: trusting, op3: _namespace }) => {
  let name = vm.constants.getString(_name);
  let reference = vm.stack.pop<VersionedReference<Opaque>>();
  let namespace = _namespace ? vm.constants.getString(_namespace) : null;

  vm.fetchValue<ComponentElementOperations>(Register.t0).setAttribute(name, reference, !!trusting, namespace);
});

interface DeferredAttribute {
  value: VersionedReference<Opaque>;
  namespace: Option<string>;
  trusting: boolean;
}

export class ComponentElementOperations {
  private attributes = dict<DeferredAttribute>();
  private classes: VersionedReference<Opaque>[] = [];

  setAttribute(name: string, value: VersionedReference<Opaque>, trusting: boolean, namespace: Option<string>) {
    let deferred = { value, namespace, trusting };

    if (name === 'class') {
      this.classes.push(value);
    }

    this.attributes[name] = deferred;
  }

  flush(vm: VM) {
    for (let name in this.attributes) {
      let attr = this.attributes[name];
      let { value: reference, namespace, trusting } = attr;

      if (name === 'class') {
        reference = new ClassListReference(this.classes);
      }

      let attribute = vm.elements().setDynamicAttribute(name, reference.value(), trusting, namespace);

      if (!isConst(reference)) {
        vm.updateWith(new UpdateDynamicAttributeOpcode(reference, attribute));
      }
    }
  }
}

class ClassListReference implements VersionedReference<Option<string>> {
  public tag: Tag;

  constructor(private list: VersionedReference<Opaque>[]) {
    this.tag = combineTagged(list);
    this.list = list;
  }

  value(): Option<string> {
    let ret: string[] = [];
    let { list } = this;

    for (let i=0; i<list.length; i++) {
      let value = normalizeStringValue(list[i].value());
      if (value) ret.push(value);
    }

    return ret.length === 0 ? null : ret.join(' ');
  }
}

APPEND_OPCODES.add(Op.DidCreateElement, (vm, { op1: _state }) => {
  let { manager, component } = vm.fetchValue<ComponentState<Opaque>>(_state);
  let operations = vm.fetchValue<ComponentElementOperations>(Register.t0);

  let action = 'DidCreateElementOpcode#evaluate';
  manager.didCreateElement(component, vm.elements().expectConstructing(action), operations);
});

APPEND_OPCODES.add(Op.GetComponentSelf, (vm, { op1: _state }) => {
  let state = vm.fetchValue<ComponentState<Opaque>>(_state);
  vm.stack.push(state.manager.getSelf(state.component));
});

APPEND_OPCODES.add(Op.GetComponentLayout, (vm, { op1: _state }) => {
  let { manager, definition, component } = vm.fetchValue<ComponentState<Opaque>>(_state);
  vm.stack.push(manager.layoutFor(definition, component, vm.env));
});

APPEND_OPCODES.add(Op.DidRenderLayout, (vm, { op1: _state }) => {
  let { manager, component } = vm.fetchValue<ComponentState<Opaque>>(_state);
  let bounds = vm.elements().popBlock();

  manager.didRenderLayout(component, bounds);

  vm.env.didCreate(component, manager);

  vm.updateWith(new DidUpdateLayoutOpcode(manager, component, bounds));
});

APPEND_OPCODES.add(Op.CommitComponentTransaction, vm => vm.commitCacheGroup());

export class UpdateComponentOpcode extends UpdatingOpcode {
  public type = 'update-component';

  public tag: Tag;

  constructor(
    tag: Tag,
    private name: string,
    private component: Component,
    private manager: ComponentManager<Component>,
    private dynamicScope: DynamicScope,
  ) {
    super();

    let componentTag = manager.getTag(component);

    if (componentTag) {
      this.tag = combine([tag, componentTag]);
    } else {
      this.tag = tag;
    }
  }

  evaluate(_vm: UpdatingVM) {
    let { component, manager, dynamicScope } = this;

    manager.update(component, dynamicScope);
  }

  toJSON(): OpcodeJSON {
    return {
      args: [JSON.stringify(this.name)],
      guid: this._guid,
      type: this.type,
    };
  }
}

export class DidUpdateLayoutOpcode extends UpdatingOpcode {
  public type = 'did-update-layout';
  public tag: Tag = CONSTANT_TAG;

  constructor(
    private manager: ComponentManager<Component>,
    private component: Component,
    private bounds: Bounds,
  ) {
    super();
  }

  evaluate(vm: UpdatingVM) {
    let { manager, component, bounds } = this;

    manager.didUpdateLayout(component, bounds);

    vm.env.didUpdate(component, manager);
  }
}
