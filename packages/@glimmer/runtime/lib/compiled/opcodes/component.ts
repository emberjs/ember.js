import { Op, Register } from '@glimmer/vm';
import { TemplateMeta } from '@glimmer/wire-format';
import { ATTRS_BLOCK } from '@glimmer/opcode-compiler';
import { Opaque, Option, Dict, dict, assert, unreachable, expect } from '@glimmer/util';
import {
  VMHandle,
  ProgramSymbolTable,
  ComponentInstanceState,
  ComponentDefinitionState,
  Recast,
  RuntimeResolver
} from '@glimmer/interfaces';
import {
  CONSTANT_TAG,
  Tag,
  VersionedReference,
  isConst,
  isConstTag
} from '@glimmer/reference';
import {
  check,
  expectStackChange,
  CheckInstanceof,
  CheckFunction,
  CheckInterface,
  CheckProgramSymbolTable,
  CheckHandle
} from '@glimmer/debug';

import Bounds from '../../bounds';
import { DynamicScope, ScopeSlot } from '../../environment';
import { APPEND_OPCODES, UpdatingOpcode } from '../../opcodes';
import { UpdatingVM, VM } from '../../vm';
import { Arguments, IArguments } from '../../vm/arguments';
import { IsCurriedComponentDefinitionReference } from './content';
import { UpdateDynamicAttributeOpcode } from './dom';
import { Component } from '../../internal-interfaces';
import { resolveComponent } from "../../component/resolve";
import {
  WithDynamicTagName,
  WithElementHook,
  ComponentDefinition,
  InternalComponentManager,
  Invocation,
  WithDynamicLayout,
  WithStaticLayout
} from '../../component/interfaces';
import {
  CurriedComponentDefinition,
  isCurriedComponentDefinition
} from '../../component/curried-component';
import CurryComponentReference from '../../references/curry-component';
import ClassListReference from '../../references/class-list';
import { capabilityFlagsFrom, Capability, hasCapability, CapabilityFlags } from '../../capabilities';
import {
  CheckReference,
  CheckArguments,
  CheckCapturedArguments,
  CheckPathReference,
  CheckComponentInstance,
  CheckFinishedComponentInstance
} from './-debug-strip';

export const ARGS = new Arguments();

/**
 * The VM creates a new ComponentInstance data structure for every component
 * invocation it encounters.
 *
 * Similar to how a ComponentDefinition contains state about all components of a
 * particular type, a ComponentInstance contains state specific to a particular
 * instance of a component type. It also contains a pointer back to its
 * component type's ComponentDefinition.
 */
export interface ComponentInstance {
  definition: ComponentDefinition;
  manager: InternalComponentManager;
  capabilities: CapabilityFlags;
  state: ComponentInstanceState;
  handle: number;
  table: ProgramSymbolTable;
}

export interface InitialComponentInstance {
  definition: PartialComponentDefinition;
  manager: Option<InternalComponentManager>;
  capabilities: Option<CapabilityFlags>;
  state: null;
  handle: Option<VMHandle>;
  table: Option<ProgramSymbolTable>;
}

export interface PopulatedComponentInstance {
  definition: ComponentDefinition;
  manager: InternalComponentManager;
  capabilities: CapabilityFlags;
  state: null;
  handle: Option<VMHandle>;
  table: Option<ProgramSymbolTable>;
}

export interface PartialComponentDefinition {
  state: Option<ComponentDefinitionState>;
  manager: InternalComponentManager;
}

APPEND_OPCODES.add(Op.IsComponent, vm => {
  let stack = vm.stack;
  let ref = check(stack.pop(), CheckReference);

  stack.push(IsCurriedComponentDefinitionReference.create(ref));
});

APPEND_OPCODES.add(Op.CurryComponent, (vm, { op1: _meta }) => {
  let stack = vm.stack;

  let definition = check(stack.pop(), CheckReference);
  let capturedArgs = check(stack.pop(), CheckCapturedArguments);

  let meta = vm.constants.getSerializable<TemplateMeta>(_meta);
  let resolver = vm.constants.resolver;

  vm.loadValue(Register.v0, new CurryComponentReference(definition, resolver, meta, capturedArgs));

  // expectStackChange(vm.stack, -args.length - 1, 'CurryComponent');
});

APPEND_OPCODES.add(Op.PushComponentDefinition, (vm, { op1: handle }) => {
  let definition = vm.constants.resolveHandle<ComponentDefinition>(handle);
  assert(!!definition, `Missing component for ${handle}`);

  let { manager } = definition;
  let capabilities = capabilityFlagsFrom(manager.getCapabilities(definition.state));

  let instance: InitialComponentInstance = {
    definition,
    manager,
    capabilities,
    state: null,
    handle: null,
    table: null
  };

  vm.stack.push(instance);

  expectStackChange(vm.stack, 1, 'PushComponentDefinition');
});

APPEND_OPCODES.add(Op.ResolveDynamicComponent, (vm, { op1: _meta }) => {
  let stack = vm.stack;
  let component = check(stack.pop(), CheckPathReference).value();
  let meta = vm.constants.getSerializable(_meta);

  vm.loadValue(Register.t1, null); // Clear the temp register

  let definition: ComponentDefinition | CurriedComponentDefinition;

  if (typeof component === 'string') {
    let { constants: { resolver } } = vm;
    let resolvedDefinition = resolveComponent(resolver, component, meta);

    definition = expect(resolvedDefinition, `Could not find a component named "${component}"`);
  } else if (isCurriedComponentDefinition(component)) {
    definition = component;
  } else {
    throw unreachable();
  }

  stack.push(definition);
  expectStackChange(vm.stack, 0, 'ResolveDynamicComponent');
});

APPEND_OPCODES.add(Op.PushDynamicComponentInstance, (vm) => {
  let { stack } = vm;
  let definition = stack.pop<ComponentDefinition>();

  let capabilities, manager;

  if (isCurriedComponentDefinition(definition)) {
    manager = capabilities = null;
  } else {
    manager = definition.manager;
    capabilities = capabilityFlagsFrom(manager.getCapabilities(definition.state));
  }

  stack.push({ definition, capabilities, manager, state: null, handle: null, table: null });
  expectStackChange(vm.stack, 0, 'PushDynamicComponentInstance');
});

APPEND_OPCODES.add(Op.PushCurriedComponent, (vm, { op1: _meta }) => {
  let stack = vm.stack;

  let component = check(stack.pop(), CheckPathReference).value();
  let definition: CurriedComponentDefinition;

  if (isCurriedComponentDefinition(component)) {
    definition = component;
  } else {
    throw unreachable();
  }

  stack.push(definition);

  expectStackChange(vm.stack, 0, 'PushCurriedComponent');
});

APPEND_OPCODES.add(Op.PushArgs, (vm, { op1: _names, op2: flags }) => {
  let stack = vm.stack;
  let names = vm.constants.getStringArray(_names);

  let positionalCount = flags >> 4;
  let synthetic = flags & 0b1000;
  let blockNames = [];

  if (flags & 0b0100) blockNames.push('main');
  if (flags & 0b0010) blockNames.push('else');
  if (flags & 0b0001) blockNames.push('attrs');

  ARGS.setup(stack, names, blockNames, positionalCount, !!synthetic);
  stack.push(ARGS);
});

APPEND_OPCODES.add(Op.CaptureArgs, vm => {
  let stack = vm.stack;

  let args = check(stack.pop(), CheckInstanceof(Arguments));
  let capturedArgs = args.capture();
  stack.push(capturedArgs);
});

APPEND_OPCODES.add(Op.PrepareArgs, (vm, { op1: _state }) => {
  let stack = vm.stack;
  let instance = vm.fetchValue<ComponentInstance>(_state);
  let args = check(stack.pop(), CheckInstanceof(Arguments));

  let { definition } = instance;

  if (isCurriedComponentDefinition(definition)) {
    assert(!definition.manager, "If the component definition was curried, we don't yet have a manager");
    definition = resolveCurriedComponentDefinition(instance, definition, args);
  }

  let { manager, state } = definition;
  let capabilities = instance.capabilities;

  if (hasCapability(capabilities, Capability.PrepareArgs) !== true) {
    stack.push(args);
    return;
  }

  let blocks = args.blocks.values;
  let blockNames = args.blocks.names;
  let preparedArgs = manager.prepareArgs(state, args);

  if (preparedArgs) {
    args.clear();

    for (let i = 0; i < blocks.length; i++) {
      stack.push(blocks[i]);
    }

    let { positional, named } = preparedArgs;

    let positionalCount = positional.length;

    for (let i = 0; i < positionalCount; i++) {
      stack.push(positional[i]);
    }

    let names = Object.keys(named);

    for (let i = 0; i < names.length; i++) {
      stack.push(named[names[i]]);
    }

    args.setup(stack, names, blockNames, positionalCount, true);
  }

  stack.push(args);
});

function resolveCurriedComponentDefinition(instance: ComponentInstance, definition: CurriedComponentDefinition, args: Arguments): ComponentDefinition {
  let unwrappedDefinition = instance.definition = definition.unwrap(args);
  let { manager, state } = unwrappedDefinition;

  assert(instance.manager === null, "component instance manager should not be populated yet");
  assert(instance.capabilities === null, "component instance manager should not be populated yet");

  instance.manager = manager;
  instance.capabilities = capabilityFlagsFrom(manager.getCapabilities(state));

  return unwrappedDefinition;
}

APPEND_OPCODES.add(Op.CreateComponent, (vm, { op1: flags, op2: _state }) => {
  let dynamicScope = vm.dynamicScope();

  let instance = vm.fetchValue<PopulatedComponentInstance>(_state);
  let { definition, manager } = instance;

  let capabilities = instance.capabilities = capabilityFlagsFrom(manager.getCapabilities(definition.state));

  let hasDefaultBlock = flags & 1;
  let args: Option<IArguments> = null;

  if (hasCapability(capabilities, Capability.CreateArgs)) {
    args = check(vm.stack.peek(), CheckArguments);
  }

  let state = manager.create(vm.env, definition.state, args, dynamicScope, vm.getSelf(), !!hasDefaultBlock);

  // We want to reuse the `state` POJO here, because we know that the opcodes
  // only transition at exactly one place.
  (instance as Recast<InitialComponentInstance, ComponentInstance>).state = state;

  let tag = manager.getTag(state);

  if (!isConstTag(tag)) {
    vm.updateWith(new UpdateComponentOpcode(tag, state, manager, dynamicScope));
  }
});

APPEND_OPCODES.add(Op.RegisterComponentDestructor, (vm, { op1: _state }) => {
  let { manager, state } = check(vm.fetchValue(_state), CheckComponentInstance);

  let destructor = manager.getDestructor(state);
  if (destructor) vm.newDestroyable(destructor);
});

APPEND_OPCODES.add(Op.BeginComponentTransaction, vm => {
  vm.beginCacheGroup();
  vm.elements().pushSimpleBlock();
});

APPEND_OPCODES.add(Op.PutComponentOperations, vm => {
  vm.loadValue(Register.t0, new ComponentElementOperations());

  expectStackChange(vm.stack, 0, 'PutComponentOperations');
});

APPEND_OPCODES.add(Op.ComponentAttr, (vm, { op1: _name, op2: trusting, op3: _namespace }) => {
  let name = vm.constants.getString(_name);
  let reference = check(vm.stack.pop(), CheckReference);
  let namespace = _namespace ? vm.constants.getString(_namespace) : null;

  check(vm.fetchValue(Register.t0), CheckInstanceof(ComponentElementOperations)).setAttribute(name, reference, !!trusting, namespace);
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

  flush(vm: VM<Opaque>) {
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

APPEND_OPCODES.add(Op.DidCreateElement, (vm, { op1: _state }) => {
  let { definition, state } = check(vm.fetchValue(_state), CheckComponentInstance);
  let { manager } = definition;

  let operations = check(vm.fetchValue(Register.t0), CheckInstanceof(ComponentElementOperations));

  let action = 'DidCreateElementOpcode#evaluate';
  (manager as WithElementHook<Component>).didCreateElement(state, vm.elements().expectConstructing(action), operations);
});

APPEND_OPCODES.add(Op.GetComponentSelf, (vm, { op1: _state }) => {
  let { definition, state } = check(vm.fetchValue(_state), CheckComponentInstance);
  let { manager } = definition;

  vm.stack.push(manager.getSelf(state));
});

APPEND_OPCODES.add(Op.GetComponentTagName, (vm, { op1: _state }) => {
  let { definition, state } = check(vm.fetchValue(_state), CheckComponentInstance);
  let { manager } = definition;

  vm.stack.push((manager as Recast<InternalComponentManager, WithDynamicTagName<Component>>).getTagName(state));
});

// Dynamic Invocation Only
APPEND_OPCODES.add(Op.GetComponentLayout, (vm, { op1: _state }) => {
  let instance = check(vm.fetchValue(_state), CheckComponentInstance);
  let { manager, definition } = instance;
  let { constants: { resolver }, stack } = vm;

  let { state: instanceState, capabilities } = instance;
  let { state: definitionState } = definition;

  let invoke: { handle: number, symbolTable: ProgramSymbolTable };

  if (hasStaticLayout(capabilities, manager)) {
    invoke = manager.getLayout(definitionState, resolver);
  } else if (hasDynamicLayout(capabilities, manager)) {
    invoke = manager.getDynamicLayout(instanceState, resolver);
  } else {
    throw unreachable();
  }

  stack.push(invoke.symbolTable);
  stack.push(invoke.handle);
});

function hasStaticLayout(capabilities: CapabilityFlags, _manager: InternalComponentManager): _manager is WithStaticLayout<ComponentInstanceState, ComponentDefinitionState, Opaque, RuntimeResolver<Opaque>> {
  return hasCapability(capabilities, Capability.DynamicLayout) === false;
}

function hasDynamicLayout(capabilities: CapabilityFlags, _manager: InternalComponentManager): _manager is WithDynamicLayout<ComponentInstanceState, Opaque, RuntimeResolver<Opaque>> {
  return hasCapability(capabilities, Capability.DynamicLayout) === true;
}

APPEND_OPCODES.add(Op.Main, (vm, { op1: register }) => {
  let definition = vm.stack.pop<ComponentDefinition>();
  let invocation = vm.stack.pop<Invocation>();

  let { manager } = definition;
  let capabilities = capabilityFlagsFrom(manager.getCapabilities(definition.state));

  let state: PopulatedComponentInstance = {
    definition,
    manager,
    capabilities,
    state: null,
    handle: invocation.handle as Recast<number, VMHandle>,
    table: invocation.symbolTable
  };

  vm.loadValue(register, state);
});

APPEND_OPCODES.add(Op.PopulateLayout, (vm, { op1: _state }) => {
  let { stack } = vm;

  let handle = check(stack.pop(), CheckHandle);
  let table = check(stack.pop(), CheckProgramSymbolTable);

  let state = check(vm.fetchValue(_state), CheckComponentInstance);

  state.handle = handle;
  state.table = table;
});

// Dynamic Invocation Only
APPEND_OPCODES.add(Op.InvokeComponentLayout, (vm, { op1: _state }) => {
  let { stack } = vm;
  let { handle, table: { symbols, hasEval } } =
    check(vm.fetchValue(_state), CheckFinishedComponentInstance);

  {
    let self = check(stack.pop(), CheckPathReference);

    let scope = vm.pushRootScope(symbols.length + 1, true);
    scope.bindSelf(self);

    let args = check(vm.stack.pop(), CheckArguments);

    let lookup: Option<Dict<ScopeSlot>> = null;

    if (hasEval) {
      lookup = dict<ScopeSlot>();
    }

    let callerNames = args.named.atNames;

    for (let i=callerNames.length - 1; i>=0; i--) {
      let atName = callerNames[i];
      let symbol = symbols.indexOf(callerNames[i]);
      let value = args.named.get(atName, false);

      if (symbol !== -1) scope.bindSymbol(symbol + 1, value);
      if (hasEval) lookup![atName] = value;
    }

    let bindBlock = (symbolName: string, blockName: string) => {
      let symbol = symbols.indexOf(symbolName);

      let block = blocks.get(blockName);

      if (symbol !== -1) {
        scope.bindBlock(symbol + 1, block);
      }

      if (lookup) lookup[symbolName] = block;
    };

    let blocks = args.blocks;
    bindBlock(ATTRS_BLOCK, 'attrs');
    bindBlock('&inverse', 'else');
    bindBlock('&default', 'main');

    if (lookup) scope.bindEvalScope(lookup);

    vm.call(handle!);
  }
});

APPEND_OPCODES.add(Op.DidRenderLayout, (vm, { op1: _state }) => {
  let { manager, state } = check(vm.fetchValue(_state), CheckComponentInstance);
  let bounds = vm.elements().popBlock();

  let mgr = check(manager, CheckInterface({ didRenderLayout: CheckFunction }));

  mgr.didRenderLayout(state, bounds);

  vm.env.didCreate(state, manager);

  vm.updateWith(new DidUpdateLayoutOpcode(manager, state, bounds));

  expectStackChange(vm.stack, 0, 'DidRenderLayout');
});

APPEND_OPCODES.add(Op.CommitComponentTransaction, vm => {
  vm.commitCacheGroup();

  expectStackChange(vm.stack, 0, 'CommitComponentTransaction');
});

export class UpdateComponentOpcode extends UpdatingOpcode {
  public type = 'update-component';

  constructor(
    public tag: Tag,
    private component: Component,
    private manager: InternalComponentManager,
    private dynamicScope: DynamicScope,
  ) {
    super();
  }

  evaluate(_vm: UpdatingVM) {
    let { component, manager, dynamicScope } = this;

    manager.update(component, dynamicScope);
  }
}

export class DidUpdateLayoutOpcode extends UpdatingOpcode {
  public type = 'did-update-layout';
  public tag: Tag = CONSTANT_TAG;

  constructor(
    private manager: InternalComponentManager,
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
