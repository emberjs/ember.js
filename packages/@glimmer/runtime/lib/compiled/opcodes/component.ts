import {
  check,
  CheckFunction,
  CheckHandle,
  CheckInstanceof,
  CheckInterface,
  CheckProgramSymbolTable,
} from '@glimmer/debug';
import {
  Bounds,
  CompilableTemplate,
  ComponentDefinition,
  ComponentDefinitionState,
  ComponentInstanceState,
  ComponentManager,
  Dict,
  DynamicScope,
  ElementOperations,
  InternalComponentManager,
  JitOrAotBlock,
  Maybe,
  Op,
  ProgramSymbolTable,
  Recast,
  RuntimeResolverDelegate,
  ScopeSlot,
  VMArguments,
  WithAotDynamicLayout,
  WithAotStaticLayout,
  WithDynamicTagName,
  WithElementHook,
  WithJitDynamicLayout,
  WithJitStaticLayout,
  WithUpdateHook,
  WithCreateInstance,
  JitRuntimeResolver,
  RuntimeResolver,
  ModifierManager,
} from '@glimmer/interfaces';
import { Reference, valueForRef, isConstRef } from '@glimmer/reference';

import {
  assert,
  dict,
  expect,
  Option,
  unreachable,
  symbol,
  unwrapTemplate,
  EMPTY_ARRAY,
  decodeHandle,
  isErrHandle,
} from '@glimmer/util';
import { $t0, $t1, $v0 } from '@glimmer/vm';
import {
  Capability,
  capabilityFlagsFrom,
  managerHasCapability,
  hasCapability,
} from '../../capabilities';
import {
  CurriedComponentDefinition,
  isCurriedComponentDefinition,
  resolveCurriedComponentDefinition,
} from '../../component/curried-component';
import { resolveComponent } from '../../component/resolve';
import { APPEND_OPCODES, UpdatingOpcode } from '../../opcodes';
import createClassListRef from '../../references/class-list';
import createCurryComponentRef from '../../references/curry-component';
import { ARGS, CONSTANTS } from '../../symbols';
import { UpdatingVM } from '../../vm';
import { InternalVM } from '../../vm/append';
import { BlockArgumentsImpl, VMArgumentsImpl } from '../../vm/arguments';
import {
  CheckArguments,
  CheckCapturedArguments,
  CheckComponentDefinition,
  CheckComponentInstance,
  CheckFinishedComponentInstance,
  CheckInvocation,
  CheckReference,
} from './-debug-strip';
import { UpdateDynamicAttributeOpcode } from './dom';
import { DEBUG } from '@glimmer/env';

/**
 * The VM creates a new ComponentInstance data structure for every component
 * invocation it encounters.
 *
 * Similar to how a ComponentDefinition contains state about all components of a
 * particular type, a ComponentInstance contains state specific to a particular
 * instance of a component type. It also contains a pointer back to its
 * component type's ComponentDefinition.
 */

export const COMPONENT_INSTANCE: unique symbol = symbol('COMPONENT_INSTANCE');

export interface ComponentInstance {
  [COMPONENT_INSTANCE]: true;
  definition: ComponentDefinition;
  manager: ComponentManager;
  capabilities: Capability;
  state: ComponentInstanceState;
  handle: number;
  table: ProgramSymbolTable;
  lookup: Option<Dict<ScopeSlot<JitOrAotBlock>>>;
}

export interface InitialComponentInstance {
  [COMPONENT_INSTANCE]: true;
  definition: PartialComponentDefinition;
  manager: Option<InternalComponentManager>;
  capabilities: Option<Capability>;
  state: null;
  handle: Option<number>;
  table: Option<ProgramSymbolTable>;
  lookup: Option<Dict<ScopeSlot<JitOrAotBlock>>>;
}

export interface PopulatedComponentInstance {
  [COMPONENT_INSTANCE]: true;
  definition: ComponentDefinition;
  manager: ComponentManager<unknown>;
  capabilities: Capability;
  state: null;
  handle: number;
  table: Option<ProgramSymbolTable>;
  lookup: Option<Dict<ScopeSlot<JitOrAotBlock>>>;
}

export interface PartialComponentDefinition {
  state: Option<ComponentDefinitionState>;
  manager: InternalComponentManager;
}

APPEND_OPCODES.add(Op.CurryComponent, (vm, { op1: _meta }) => {
  let stack = vm.stack;

  let definition = check(stack.popJs(), CheckReference);
  let capturedArgs = check(stack.popJs(), CheckCapturedArguments);

  let meta = vm[CONSTANTS].getValue(decodeHandle(_meta));
  let resolver = vm.runtime.resolver;

  vm.loadValue($v0, createCurryComponentRef(definition, resolver, meta, capturedArgs));
});

APPEND_OPCODES.add(Op.PushComponentDefinition, (vm, { op1: handle }) => {
  let definition = vm.runtime.resolver.resolve<ComponentDefinition>(handle);
  assert(!!definition, `Missing component for ${handle}`);

  let { manager } = definition;
  let capabilities = capabilityFlagsFrom(manager.getCapabilities(definition.state));

  let instance: InitialComponentInstance = {
    [COMPONENT_INSTANCE]: true,
    definition,
    manager,
    capabilities,
    state: null,
    handle: null,
    table: null,
    lookup: null,
  };

  vm.stack.pushJs(instance);
});

APPEND_OPCODES.add(Op.ResolveDynamicComponent, (vm, { op1: _meta }) => {
  let stack = vm.stack;
  let component = valueForRef(check(stack.popJs(), CheckReference)) as Maybe<Dict>;
  let meta = vm[CONSTANTS].getValue(_meta);

  vm.loadValue($t1, null); // Clear the temp register

  let definition: ComponentDefinition | CurriedComponentDefinition;

  if (typeof component === 'string') {
    let resolvedDefinition = resolveComponent(vm.runtime.resolver, component, meta);

    definition = expect(resolvedDefinition, `Could not find a component named "${component}"`);
  } else if (isCurriedComponentDefinition(component)) {
    definition = component;
  } else {
    throw unreachable();
  }

  stack.pushJs(definition);
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

  stack.pushJs({ definition, capabilities, manager, state: null, handle: null, table: null });
});

APPEND_OPCODES.add(Op.PushCurriedComponent, (vm) => {
  let stack = vm.stack;

  let component = valueForRef(check(stack.popJs(), CheckReference)) as Maybe<Dict>;
  let definition: CurriedComponentDefinition;

  if (isCurriedComponentDefinition(component)) {
    definition = component;
  } else {
    throw unreachable();
  }

  stack.pushJs(definition);
});

APPEND_OPCODES.add(Op.PushArgs, (vm, { op1: _names, op2: _blockNames, op3: flags }) => {
  let stack = vm.stack;
  let names = vm[CONSTANTS].getArray<string>(_names);

  let positionalCount = flags >> 4;
  let atNames = flags & 0b1000;
  let blockNames = flags & 0b0111 ? vm[CONSTANTS].getArray<string>(_blockNames) : EMPTY_ARRAY;

  vm[ARGS].setup(stack, names, blockNames, positionalCount, !!atNames);
  stack.pushJs(vm[ARGS]);
});

APPEND_OPCODES.add(Op.PushEmptyArgs, (vm) => {
  let { stack } = vm;

  stack.pushJs(vm[ARGS].empty(stack));
});

APPEND_OPCODES.add(Op.CaptureArgs, (vm) => {
  let stack = vm.stack;

  let args = check(stack.popJs(), CheckInstanceof(VMArgumentsImpl));
  let capturedArgs = args.capture();
  stack.pushJs(capturedArgs);
});

APPEND_OPCODES.add(Op.PrepareArgs, (vm, { op1: _state }) => {
  let stack = vm.stack;
  let instance = vm.fetchValue<ComponentInstance>(_state);
  let args = check(stack.popJs(), CheckInstanceof(VMArgumentsImpl));

  let { definition } = instance;

  if (isCurriedComponentDefinition(definition)) {
    assert(
      !definition.manager,
      "If the component definition was curried, we don't yet have a manager"
    );
    definition = resolveCurriedComponentDefinition(instance, definition, args);
  }

  let { manager, state } = definition;
  let capabilities = instance.capabilities;

  if (!managerHasCapability(manager, capabilities, Capability.PrepareArgs)) {
    stack.pushJs(args);
    return;
  }

  let blocks = args.blocks.values;
  let blockNames = args.blocks.names;
  let preparedArgs = manager.prepareArgs(state, args);

  if (preparedArgs) {
    args.clear();

    for (let i = 0; i < blocks.length; i++) {
      let block = blocks[i];

      if (typeof block === 'number') {
        stack.pushSmallInt(block);
      } else {
        stack.pushJs(block);
      }
    }

    let { positional, named } = preparedArgs;

    let positionalCount = positional.length;

    for (let i = 0; i < positionalCount; i++) {
      stack.pushJs(positional[i]);
    }

    let names = Object.keys(named);

    for (let i = 0; i < names.length; i++) {
      stack.pushJs(named[names[i]]);
    }

    args.setup(stack, names, blockNames, positionalCount, false);
  }

  stack.pushJs(args);
});

APPEND_OPCODES.add(Op.CreateComponent, (vm, { op1: flags, op2: _state }) => {
  let instance = check(vm.fetchValue(_state), CheckComponentInstance);
  let { definition, manager } = instance;

  let capabilities = (instance.capabilities = capabilityFlagsFrom(
    manager.getCapabilities(definition.state)
  ));

  if (!managerHasCapability(manager, capabilities, Capability.CreateInstance)) {
    throw new Error(`BUG`);
  }

  let dynamicScope: Option<DynamicScope> = null;
  if (managerHasCapability(manager, capabilities, Capability.DynamicScope)) {
    dynamicScope = vm.dynamicScope();
  }

  let hasDefaultBlock = flags & 1;
  let args: Option<VMArguments> = null;

  if (managerHasCapability(manager, capabilities, Capability.CreateArgs)) {
    args = check(vm.stack.peekJs(), CheckArguments);
  }

  let self: Option<Reference> = null;
  if (managerHasCapability(manager, capabilities, Capability.CreateCaller)) {
    self = vm.getSelf();
  }

  let state = manager.create(vm.env, definition.state, args, dynamicScope, self, !!hasDefaultBlock);

  // We want to reuse the `state` POJO here, because we know that the opcodes
  // only transition at exactly one place.
  instance.state = state;

  if (managerHasCapability(manager, capabilities, Capability.UpdateHook)) {
    vm.updateWith(new UpdateComponentOpcode(state, manager, dynamicScope));
  }
});

APPEND_OPCODES.add(Op.RegisterComponentDestructor, (vm, { op1: _state }) => {
  let { manager, state, capabilities } = check(vm.fetchValue(_state), CheckComponentInstance);

  let d = manager.getDestroyable(state);

  if (
    DEBUG &&
    !hasCapability(capabilities, Capability.WillDestroy) &&
    d !== null &&
    typeof 'willDestroy' in d
  ) {
    throw new Error(
      'BUG: Destructor has willDestroy, but the willDestroy capability was not enabled for this component. Pre-destruction hooks must be explicitly opted into'
    );
  }

  if (d) vm.associateDestroyable(d);
});

APPEND_OPCODES.add(Op.BeginComponentTransaction, (vm, { op1: _state }) => {
  let name;

  if (DEBUG) {
    let { definition, manager } = check(vm.fetchValue(_state), CheckComponentInstance);

    name = manager.getDebugName(definition.state);
  }

  vm.beginCacheGroup(name);
  vm.elements().pushSimpleBlock();
});

APPEND_OPCODES.add(Op.PutComponentOperations, (vm) => {
  vm.loadValue($t0, new ComponentElementOperations());
});

APPEND_OPCODES.add(Op.ComponentAttr, (vm, { op1: _name, op2: trusting, op3: _namespace }) => {
  let name = vm[CONSTANTS].getValue<string>(_name);
  let reference = check(vm.stack.popJs(), CheckReference);
  let namespace = _namespace ? vm[CONSTANTS].getValue<string>(_namespace) : null;

  check(vm.fetchValue($t0), CheckInstanceof(ComponentElementOperations)).setAttribute(
    name,
    reference,
    !!trusting,
    namespace
  );
});

APPEND_OPCODES.add(Op.StaticComponentAttr, (vm, { op1: _name, op2: _value, op3: _namespace }) => {
  let name = vm[CONSTANTS].getValue<string>(_name);
  let value = vm[CONSTANTS].getValue<string>(_value);
  let namespace = _namespace ? vm[CONSTANTS].getValue<string>(_namespace) : null;

  check(vm.fetchValue($t0), CheckInstanceof(ComponentElementOperations)).setStaticAttribute(
    name,
    value,
    namespace
  );
});

type DeferredAttribute = {
  value: string | Reference<unknown>;
  namespace: Option<string>;
  trusting?: boolean;
};

export class ComponentElementOperations implements ElementOperations {
  private attributes = dict<DeferredAttribute>();
  private classes: (string | Reference<unknown>)[] = [];
  private modifiers: [ModifierManager<unknown>, unknown][] = [];

  setAttribute(
    name: string,
    value: Reference<unknown>,
    trusting: boolean,
    namespace: Option<string>
  ) {
    let deferred = { value, namespace, trusting };

    if (name === 'class') {
      this.classes.push(value);
    }

    this.attributes[name] = deferred;
  }

  setStaticAttribute(name: string, value: string, namespace: Option<string>): void {
    let deferred = { value, namespace };

    if (name === 'class') {
      this.classes.push(value);
    }

    this.attributes[name] = deferred;
  }

  addModifier<S>(manager: ModifierManager<S>, state: S): void {
    this.modifiers.push([manager, state]);
  }

  flush(vm: InternalVM<JitOrAotBlock>): [ModifierManager<unknown>, unknown][] {
    let type: DeferredAttribute | undefined;
    let attributes = this.attributes;

    for (let name in this.attributes) {
      if (name === 'type') {
        type = attributes[name];
        continue;
      }

      let attr = this.attributes[name];
      if (name === 'class') {
        setDeferredAttr(vm, 'class', mergeClasses(this.classes), attr.namespace, attr.trusting);
      } else {
        setDeferredAttr(vm, name, attr.value, attr.namespace, attr.trusting);
      }
    }

    if (type !== undefined) {
      setDeferredAttr(vm, 'type', type.value, type.namespace, type.trusting);
    }

    return this.modifiers;
  }
}

function mergeClasses(classes: (string | Reference)[]): string | Reference<unknown> {
  if (classes.length === 0) {
    return '';
  }
  if (classes.length === 1) {
    return classes[0];
  }
  if (allStringClasses(classes)) {
    return classes.join(' ');
  }

  return createClassListRef(classes as Reference[]);
}

function allStringClasses(classes: (string | Reference<unknown>)[]): classes is string[] {
  for (let i = 0; i < classes.length; i++) {
    if (typeof classes[i] !== 'string') {
      return false;
    }
  }
  return true;
}

function setDeferredAttr(
  vm: InternalVM<JitOrAotBlock>,
  name: string,
  value: string | Reference<unknown>,
  namespace: Option<string>,
  trusting = false
) {
  if (typeof value === 'string') {
    vm.elements().setStaticAttribute(name, value, namespace);
  } else {
    let attribute = vm
      .elements()
      .setDynamicAttribute(name, valueForRef(value), trusting, namespace);
    if (!isConstRef(value)) {
      vm.updateWith(new UpdateDynamicAttributeOpcode(value, attribute));
    }
  }
}

APPEND_OPCODES.add(Op.DidCreateElement, (vm, { op1: _state }) => {
  let { definition, state } = check(vm.fetchValue(_state), CheckComponentInstance);
  let { manager } = definition;

  let operations = check(vm.fetchValue($t0), CheckInstanceof(ComponentElementOperations));

  (manager as WithElementHook<unknown>).didCreateElement(
    state,
    expect(vm.elements().constructing, `Expected a constructing elemet in DidCreateOpcode`),
    operations
  );
});

APPEND_OPCODES.add(Op.GetComponentSelf, (vm, { op1: _state }) => {
  let { definition, state } = check(vm.fetchValue(_state), CheckComponentInstance);
  let { manager } = definition;

  vm.stack.pushJs(manager.getSelf(state));
});

APPEND_OPCODES.add(Op.GetComponentTagName, (vm, { op1: _state }) => {
  let { definition, state } = check(vm.fetchValue(_state), CheckComponentInstance);
  let { manager } = definition;

  let tagName = (manager as Recast<
    InternalComponentManager,
    WithDynamicTagName<unknown>
  >).getTagName(state);

  // User provided value from JS, so we don't bother to encode
  vm.stack.pushJs(tagName);
});

// Dynamic Invocation Only
APPEND_OPCODES.add(
  Op.GetJitComponentLayout,
  (vm, { op1: _state }) => {
    let instance = check(vm.fetchValue(_state), CheckComponentInstance);

    let manager = instance.manager as WithJitStaticLayout | WithJitDynamicLayout;
    let { definition } = instance;
    let { stack } = vm;

    let { capabilities } = instance;

    // let invoke: { handle: number; symbolTable: ProgramSymbolTable };

    let layout: CompilableTemplate;

    if (hasStaticLayoutCapability(capabilities, manager)) {
      layout = manager.getJitStaticLayout(definition.state, vm.runtime.resolver);
    } else if (hasDynamicLayoutCapability(capabilities, manager)) {
      let template = unwrapTemplate(
        manager.getJitDynamicLayout(instance.state, vm.runtime.resolver)
      );

      if (hasCapability(capabilities, Capability.Wrapped)) {
        layout = template.asWrappedLayout();
      } else {
        layout = template.asLayout();
      }
    } else {
      throw unreachable();
    }

    let handle = layout.compile(vm.context);

    stack.pushJs(layout.symbolTable);

    if (DEBUG && isErrHandle(handle)) {
      stack.pushJs(handle);
    } else {
      stack.pushSmallInt(handle as number);
    }
  },
  'jit'
);

// Dynamic Invocation Only
APPEND_OPCODES.add(Op.GetAotComponentLayout, (vm, { op1: _state }) => {
  let instance = check(vm.fetchValue(_state), CheckComponentInstance);
  let { manager, definition } = instance;
  let { stack } = vm;

  let { state: instanceState, capabilities } = instance;
  let { state: definitionState } = definition;

  let invoke: { handle: number; symbolTable: ProgramSymbolTable };

  if (hasStaticLayoutCapability(capabilities, manager)) {
    invoke = (manager as WithAotStaticLayout<
      ComponentInstanceState,
      ComponentDefinitionState,
      RuntimeResolverDelegate
    >).getAotStaticLayout(definitionState, vm.runtime.resolver);
  } else if (hasDynamicLayoutCapability(capabilities, manager)) {
    invoke = (manager as WithAotDynamicLayout<
      ComponentInstanceState,
      RuntimeResolver
    >).getAotDynamicLayout(instanceState, vm.runtime.resolver);
  } else {
    throw unreachable();
  }

  stack.pushJs(invoke.symbolTable);

  if (DEBUG && isErrHandle(invoke.handle)) {
    stack.pushJs(invoke.handle);
  } else {
    stack.pushSmallInt(invoke.handle);
  }
});

// These types are absurd here
export function hasStaticLayoutCapability(
  capabilities: Capability,
  _manager: InternalComponentManager
): _manager is
  | WithJitStaticLayout<ComponentInstanceState, ComponentDefinitionState, JitRuntimeResolver>
  | WithAotStaticLayout<ComponentInstanceState, ComponentDefinitionState, RuntimeResolver> {
  return managerHasCapability(_manager, capabilities, Capability.DynamicLayout) === false;
}

export function hasJitStaticLayoutCapability(
  capabilities: Capability,
  _manager: InternalComponentManager
): _manager is WithJitStaticLayout<
  ComponentInstanceState,
  ComponentDefinitionState,
  JitRuntimeResolver
> {
  return managerHasCapability(_manager, capabilities, Capability.DynamicLayout) === false;
}

export function hasDynamicLayoutCapability(
  capabilities: Capability,
  _manager: InternalComponentManager
): _manager is
  | WithJitDynamicLayout<ComponentInstanceState, JitRuntimeResolver>
  | WithAotDynamicLayout<ComponentInstanceState, RuntimeResolver> {
  return managerHasCapability(_manager, capabilities, Capability.DynamicLayout) === true;
}

APPEND_OPCODES.add(Op.Main, (vm, { op1: register }) => {
  let definition = check(vm.stack.popJs(), CheckComponentDefinition);
  let invocation = check(vm.stack.popJs(), CheckInvocation);

  let { manager } = definition;
  let capabilities = capabilityFlagsFrom(manager.getCapabilities(definition.state));

  let state: PopulatedComponentInstance = {
    [COMPONENT_INSTANCE]: true,
    definition,
    manager,
    capabilities,
    state: null,
    handle: invocation.handle,
    table: invocation.symbolTable,
    lookup: null,
  };

  vm.loadValue(register, state);
});

APPEND_OPCODES.add(Op.PopulateLayout, (vm, { op1: _state }) => {
  let { stack } = vm;

  // In DEBUG handles could be ErrHandle objects
  let handle = check(DEBUG ? stack.pop() : stack.popSmallInt(), CheckHandle);
  let table = check(stack.popJs(), CheckProgramSymbolTable);

  let state = check(vm.fetchValue(_state), CheckComponentInstance);

  state.handle = handle;
  state.table = table;
});

APPEND_OPCODES.add(Op.VirtualRootScope, (vm, { op1: _state }) => {
  let { symbols } = check(vm.fetchValue(_state), CheckFinishedComponentInstance).table;

  vm.pushRootScope(symbols.length + 1);
});

APPEND_OPCODES.add(Op.SetupForEval, (vm, { op1: _state }) => {
  let state = check(vm.fetchValue(_state), CheckFinishedComponentInstance);

  if (state.table.hasEval) {
    let lookup = (state.lookup = dict<ScopeSlot<JitOrAotBlock>>());
    vm.scope().bindEvalScope(lookup);
  }
});

APPEND_OPCODES.add(Op.SetNamedVariables, (vm, { op1: _state }) => {
  let state = check(vm.fetchValue(_state), CheckFinishedComponentInstance);
  let scope = vm.scope();

  let args = check(vm.stack.peekJs(), CheckArguments);
  let callerNames = args.named.atNames;

  for (let i = callerNames.length - 1; i >= 0; i--) {
    let atName = callerNames[i];
    let symbol = state.table.symbols.indexOf(callerNames[i]);
    let value = args.named.get(atName, true);

    if (symbol !== -1) scope.bindSymbol(symbol + 1, value);
    if (state.lookup) state.lookup[atName] = value;
  }
});

function bindBlock<C extends JitOrAotBlock>(
  symbolName: string,
  blockName: string,
  state: ComponentInstance,
  blocks: BlockArgumentsImpl<C>,
  vm: InternalVM<C>
) {
  let symbol = state.table.symbols.indexOf(symbolName);
  let block = blocks.get(blockName);

  if (symbol !== -1) vm.scope().bindBlock(symbol + 1, block);
  if (state.lookup) state.lookup[symbolName] = block;
}

APPEND_OPCODES.add(Op.SetBlocks, (vm, { op1: _state }) => {
  let state = check(vm.fetchValue(_state), CheckFinishedComponentInstance);
  let { blocks } = check(vm.stack.peekJs(), CheckArguments);

  for (let i = 0; i < blocks.names.length; i++) {
    bindBlock(blocks.symbolNames[i], blocks.names[i], state, blocks, vm);
  }
});

// Dynamic Invocation Only
APPEND_OPCODES.add(Op.InvokeComponentLayout, (vm, { op1: _state }) => {
  let state = check(vm.fetchValue(_state), CheckFinishedComponentInstance);

  vm.call(state.handle!);
});

APPEND_OPCODES.add(Op.DidRenderLayout, (vm, { op1: _state }) => {
  let { manager, state, capabilities } = check(vm.fetchValue(_state), CheckComponentInstance);
  let bounds = vm.elements().popBlock();

  if (!managerHasCapability(manager, capabilities, Capability.CreateInstance)) {
    throw new Error(`BUG`);
  }

  let mgr = check(manager, CheckInterface({ didRenderLayout: CheckFunction }));

  mgr.didRenderLayout(state, bounds);

  vm.env.didCreate(state, manager);

  vm.updateWith(new DidUpdateLayoutOpcode(manager, state, bounds));
});

APPEND_OPCODES.add(Op.CommitComponentTransaction, (vm) => {
  vm.commitCacheGroup();
});

export class UpdateComponentOpcode extends UpdatingOpcode {
  public type = 'update-component';

  constructor(
    private component: ComponentInstanceState,
    private manager: WithUpdateHook,
    private dynamicScope: Option<DynamicScope>
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

  constructor(
    private manager: WithCreateInstance,
    private component: ComponentInstanceState,
    private bounds: Bounds
  ) {
    super();
  }

  evaluate(vm: UpdatingVM) {
    let { manager, component, bounds } = this;

    manager.didUpdateLayout(component, bounds);

    vm.env.didUpdate(component, manager);
  }
}
