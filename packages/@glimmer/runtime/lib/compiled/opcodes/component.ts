import {
  check,
  CheckFunction,
  CheckHandle,
  CheckInstanceof,
  CheckInterface,
  CheckNull,
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
  RuntimeResolver,
  ScopeSlot,
  VMArguments,
  WithAotDynamicLayout,
  WithAotStaticLayout,
  WithDynamicTagName,
  WithElementHook,
  WithJitDynamicLayout,
  WithJitStaticLayout,
} from '@glimmer/interfaces';
import {
  CONSTANT_TAG,
  isConst,
  isConstTag,
  Tag,
  VersionedPathReference,
  VersionedReference,
} from '@glimmer/reference';
import { assert, dict, expect, Option, unreachable } from '@glimmer/util';
import { $t0, $t1, $v0 } from '@glimmer/vm';
import {
  Capability,
  CapabilityFlags,
  capabilityFlagsFrom,
  hasCapability,
} from '../../capabilities';
import {
  CurriedComponentDefinition,
  isCurriedComponentDefinition,
} from '../../component/curried-component';
import { resolveComponent } from '../../component/resolve';
import { APPEND_OPCODES, UpdatingOpcode } from '../../opcodes';
import ClassListReference from '../../references/class-list';
import CurryComponentReference from '../../references/curry-component';
import { ARGS, CONSTANTS } from '../../symbols';
import { UpdatingVM } from '../../vm';
import { InternalVM } from '../../vm/append';
import { BlockArgumentsImpl, VMArgumentsImpl } from '../../vm/arguments';
import {
  CheckArguments,
  CheckCapturedArguments,
  CheckComponentDefinition,
  CheckComponentInstance,
  CheckCurryComponent,
  CheckElementOperations,
  CheckFinishedComponentInstance,
  CheckInvocation,
  CheckPathReference,
  CheckReference,
} from './-debug-strip';
import { ContentTypeReference, IsCurriedComponentDefinitionReference } from './content';
import { UpdateDynamicAttributeOpcode } from './dom';

/**
 * The VM creates a new ComponentInstance data structure for every component
 * invocation it encounters.
 *
 * Similar to how a ComponentDefinition contains state about all components of a
 * particular type, a ComponentInstance contains state specific to a particular
 * instance of a component type. It also contains a pointer back to its
 * component type's ComponentDefinition.
 */

export const COMPONENT_INSTANCE = Symbol('COMPONENT_INSTANCE');

export interface ComponentInstance {
  [COMPONENT_INSTANCE]: true;
  definition: ComponentDefinition;
  manager: InternalComponentManager;
  capabilities: CapabilityFlags;
  state: ComponentInstanceState;
  handle: number;
  table: ProgramSymbolTable;
  lookup: Option<Dict<ScopeSlot<JitOrAotBlock>>>;
}

export interface InitialComponentInstance {
  [COMPONENT_INSTANCE]: true;
  definition: PartialComponentDefinition;
  manager: Option<InternalComponentManager>;
  capabilities: Option<CapabilityFlags>;
  state: null;
  handle: Option<number>;
  table: Option<ProgramSymbolTable>;
  lookup: Option<Dict<ScopeSlot<JitOrAotBlock>>>;
}

export interface PopulatedComponentInstance {
  [COMPONENT_INSTANCE]: true;
  definition: ComponentDefinition;
  manager: ComponentManager<unknown, unknown>;
  capabilities: CapabilityFlags;
  state: null;
  handle: number;
  table: Option<ProgramSymbolTable>;
  lookup: Option<Dict<ScopeSlot<JitOrAotBlock>>>;
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

APPEND_OPCODES.add(Op.ContentType, vm => {
  let stack = vm.stack;
  let ref = check(stack.peek(), CheckReference);

  stack.push(new ContentTypeReference(ref));
});

APPEND_OPCODES.add(Op.CurryComponent, (vm, { op1: _meta }) => {
  let stack = vm.stack;

  let definition = check(stack.pop(), CheckReference);
  let capturedArgs = check(stack.pop(), CheckCapturedArguments);

  let meta = vm[CONSTANTS].getTemplateMeta(_meta);
  let resolver = vm.runtime.resolver;

  vm.loadValue(
    $v0,
    new CurryComponentReference(definition, resolver, meta, capturedArgs),
    CheckCurryComponent
  );

  // expectStackChange(vm.stack, -args.length - 1, 'CurryComponent');
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

  vm.stack.push(instance);
});

APPEND_OPCODES.add(Op.ResolveDynamicComponent, (vm, { op1: _meta }) => {
  let stack = vm.stack;
  let component = check(stack.pop(), CheckPathReference).value() as Maybe<Dict>;
  let meta = vm[CONSTANTS].getTemplateMeta(_meta);

  vm.loadValue($t1, null, CheckNull); // Clear the temp register

  let definition: ComponentDefinition | CurriedComponentDefinition;

  if (typeof component === 'string') {
    let resolvedDefinition = resolveComponent(vm.runtime.resolver, component, meta);

    definition = expect(resolvedDefinition, `Could not find a component named "${component}"`);
  } else if (isCurriedComponentDefinition(component)) {
    definition = component;
  } else {
    throw unreachable();
  }

  stack.push(definition);
});

APPEND_OPCODES.add(Op.PushDynamicComponentInstance, vm => {
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
});

APPEND_OPCODES.add(Op.PushCurriedComponent, vm => {
  let stack = vm.stack;

  let component = check(stack.pop(), CheckPathReference).value() as Maybe<Dict>;
  let definition: CurriedComponentDefinition;

  if (isCurriedComponentDefinition(component)) {
    definition = component;
  } else {
    throw unreachable();
  }

  stack.push(definition);
});

APPEND_OPCODES.add(Op.PushArgs, (vm, { op1: _names, op2: flags }) => {
  let stack = vm.stack;
  let names = vm[CONSTANTS].getStringArray(_names);

  let positionalCount = flags >> 4;
  let atNames = flags & 0b1000;
  let blockNames: string[] = [];

  if (flags & 0b0100) blockNames.push('main');
  if (flags & 0b0010) blockNames.push('else');
  if (flags & 0b0001) blockNames.push('attrs');

  vm[ARGS].setup(stack, names, blockNames, positionalCount, !!atNames);
  stack.push(vm[ARGS]);
});

APPEND_OPCODES.add(Op.PushEmptyArgs, vm => {
  let { stack } = vm;

  stack.push(vm[ARGS].empty(stack));
});

APPEND_OPCODES.add(Op.CaptureArgs, vm => {
  let stack = vm.stack;

  let args = check(stack.pop(), CheckInstanceof(VMArgumentsImpl));
  let capturedArgs = args.capture();
  stack.push(capturedArgs);
});

APPEND_OPCODES.add(Op.PrepareArgs, (vm, { op1: _state }) => {
  let stack = vm.stack;
  let instance = vm.fetchValue<ComponentInstance>(_state);
  let args = check(stack.pop(), CheckInstanceof(VMArgumentsImpl));

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

    args.setup(stack, names, blockNames, positionalCount, false);
  }

  stack.push(args);
});

function resolveCurriedComponentDefinition(
  instance: ComponentInstance,
  definition: CurriedComponentDefinition,
  args: VMArgumentsImpl
): ComponentDefinition {
  let unwrappedDefinition = (instance.definition = definition.unwrap(args));
  let { manager, state } = unwrappedDefinition;

  assert(instance.manager === null, 'component instance manager should not be populated yet');
  assert(instance.capabilities === null, 'component instance manager should not be populated yet');

  instance.manager = manager;
  instance.capabilities = capabilityFlagsFrom(manager.getCapabilities(state));

  return unwrappedDefinition;
}

APPEND_OPCODES.add(Op.CreateComponent, (vm, { op1: flags, op2: _state }) => {
  let instance = check(vm.fetchValue(_state), CheckComponentInstance);
  let { definition, manager } = instance;

  let capabilities = (instance.capabilities = capabilityFlagsFrom(
    manager.getCapabilities(definition.state)
  ));

  let dynamicScope: Option<DynamicScope> = null;
  if (hasCapability(capabilities, Capability.DynamicScope)) {
    dynamicScope = vm.dynamicScope();
  }

  let hasDefaultBlock = flags & 1;
  let args: Option<VMArguments> = null;

  if (hasCapability(capabilities, Capability.CreateArgs)) {
    args = check(vm.stack.peek(), CheckArguments);
  }

  let self: Option<VersionedPathReference<unknown>> = null;
  if (hasCapability(capabilities, Capability.CreateCaller)) {
    self = vm.getSelf();
  }

  let state = manager.create(vm.env, definition.state, args, dynamicScope, self, !!hasDefaultBlock);

  // We want to reuse the `state` POJO here, because we know that the opcodes
  // only transition at exactly one place.
  instance.state = state;

  let tag = manager.getTag(state);

  if (hasCapability(capabilities, Capability.UpdateHook) && !isConstTag(tag)) {
    vm.updateWith(new UpdateComponentOpcode(tag, state, manager, dynamicScope));
  }
});

APPEND_OPCODES.add(Op.RegisterComponentDestructor, (vm, { op1: _state }) => {
  let { manager, state } = check(vm.fetchValue(_state), CheckComponentInstance);

  let d = manager.getDestructor(state);
  if (d) vm.associateDestroyable(d);
});

APPEND_OPCODES.add(Op.BeginComponentTransaction, vm => {
  vm.beginCacheGroup();
  vm.elements().pushSimpleBlock();
});

APPEND_OPCODES.add(Op.PutComponentOperations, vm => {
  vm.loadValue($t0, new ComponentElementOperations(), CheckElementOperations);
});

APPEND_OPCODES.add(Op.ComponentAttr, (vm, { op1: _name, op2: trusting, op3: _namespace }) => {
  let name = vm[CONSTANTS].getString(_name);
  let reference = check(vm.stack.pop(), CheckReference);
  let namespace = _namespace ? vm[CONSTANTS].getString(_namespace) : null;

  check(vm.fetchValue($t0), CheckInstanceof(ComponentElementOperations)).setAttribute(
    name,
    reference,
    !!trusting,
    namespace
  );
});

interface DeferredAttribute {
  value: VersionedReference<unknown>;
  namespace: Option<string>;
  trusting: boolean;
}

export class ComponentElementOperations implements ElementOperations {
  private attributes = dict<DeferredAttribute>();
  private classes: VersionedReference<unknown>[] = [];

  setAttribute(
    name: string,
    value: VersionedReference<unknown>,
    trusting: boolean,
    namespace: Option<string>
  ) {
    let deferred = { value, namespace, trusting };

    if (name === 'class') {
      this.classes.push(value);
    }

    this.attributes[name] = deferred;
  }

  flush(vm: InternalVM<JitOrAotBlock>) {
    for (let name in this.attributes) {
      let attr = this.attributes[name];
      let { value: reference, namespace, trusting } = attr;

      if (name === 'class') {
        reference = new ClassListReference(this.classes);
      }

      if (name === 'type') {
        continue;
      }

      let attribute = vm
        .elements()
        .setDynamicAttribute(name, reference.value(), trusting, namespace);

      if (!isConst(reference)) {
        vm.updateWith(new UpdateDynamicAttributeOpcode(reference, attribute));
      }
    }

    if ('type' in this.attributes) {
      let type = this.attributes.type;
      let { value: reference, namespace, trusting } = type;

      let attribute = vm
        .elements()
        .setDynamicAttribute('type', reference.value(), trusting, namespace);

      if (!isConst(reference)) {
        vm.updateWith(new UpdateDynamicAttributeOpcode(reference, attribute));
      }
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

  vm.stack.push(manager.getSelf(state));
});

APPEND_OPCODES.add(Op.GetComponentTagName, (vm, { op1: _state }) => {
  let { definition, state } = check(vm.fetchValue(_state), CheckComponentInstance);
  let { manager } = definition;

  vm.stack.push(
    (manager as Recast<InternalComponentManager, WithDynamicTagName<unknown>>).getTagName(state)
  );
});

// Dynamic Invocation Only
APPEND_OPCODES.add(
  Op.GetJitComponentLayout,
  (vm, { op1: _state }) => {
    let instance = check(vm.fetchValue(_state), CheckComponentInstance);
    let { manager, definition } = instance;
    let { stack } = vm;

    let { state: instanceState, capabilities } = instance;
    let { state: definitionState } = definition;

    // let invoke: { handle: number; symbolTable: ProgramSymbolTable };

    let layout: CompilableTemplate;

    if (hasStaticLayoutCapability(capabilities, manager)) {
      layout = (manager as WithJitStaticLayout<
        ComponentInstanceState,
        ComponentDefinitionState,
        RuntimeResolver
      >).getJitStaticLayout(definitionState, vm.runtime.resolver);
    } else if (hasDynamicLayoutCapability(capabilities, manager)) {
      layout = (manager as WithJitDynamicLayout<
        ComponentInstanceState,
        RuntimeResolver
      >).getJitDynamicLayout(instanceState, vm.runtime.resolver, vm.context);
    } else {
      throw unreachable();
    }

    let handle = layout.compile(vm.context);

    stack.push(layout.symbolTable);
    stack.push(handle);
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
      RuntimeResolver
    >).getAotStaticLayout(definitionState, vm.runtime.resolver);
  } else if (hasDynamicLayoutCapability(capabilities, manager)) {
    invoke = (manager as WithAotDynamicLayout<
      ComponentInstanceState,
      RuntimeResolver
    >).getAotDynamicLayout(instanceState, vm.runtime.resolver);
  } else {
    throw unreachable();
  }

  stack.push(invoke.symbolTable);
  stack.push(invoke.handle);
});

// These types are absurd here
export function hasStaticLayoutCapability(
  capabilities: CapabilityFlags,
  _manager: InternalComponentManager
): _manager is
  | WithJitStaticLayout<ComponentInstanceState, ComponentDefinitionState, RuntimeResolver>
  | WithAotStaticLayout<ComponentInstanceState, ComponentDefinitionState, RuntimeResolver> {
  return hasCapability(capabilities, Capability.DynamicLayout) === false;
}

export function hasDynamicLayoutCapability(
  capabilities: CapabilityFlags,
  _manager: InternalComponentManager
): _manager is
  | WithAotDynamicLayout<ComponentInstanceState, RuntimeResolver>
  | WithJitDynamicLayout<ComponentInstanceState, RuntimeResolver> {
  return hasCapability(capabilities, Capability.DynamicLayout) === true;
}

APPEND_OPCODES.add(Op.Main, (vm, { op1: register }) => {
  let definition = check(vm.stack.pop(), CheckComponentDefinition);
  let invocation = check(vm.stack.pop(), CheckInvocation);

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

  vm.loadValue(register, state, CheckComponentInstance);
});

APPEND_OPCODES.add(Op.PopulateLayout, (vm, { op1: _state }) => {
  let { stack } = vm;

  let handle = check(stack.pop(), CheckHandle);
  let table = check(stack.pop(), CheckProgramSymbolTable);

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

  let args = check(vm.stack.peek(), CheckArguments);
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

  if (symbol !== -1) {
    vm.scope().bindBlock(symbol + 1, block);
  }

  if (state.lookup) state.lookup[symbolName] = block;
}

APPEND_OPCODES.add(Op.SetBlocks, (vm, { op1: _state }) => {
  let state = check(vm.fetchValue(_state), CheckFinishedComponentInstance);
  let { blocks } = check(vm.stack.peek(), CheckArguments);

  bindBlock('&attrs', 'attrs', state, blocks, vm);
  bindBlock('&else', 'else', state, blocks, vm);
  bindBlock('&default', 'main', state, blocks, vm);
});

// Dynamic Invocation Only
APPEND_OPCODES.add(Op.InvokeComponentLayout, (vm, { op1: _state }) => {
  let state = check(vm.fetchValue(_state), CheckFinishedComponentInstance);

  vm.call(state.handle!);
});

APPEND_OPCODES.add(Op.DidRenderLayout, (vm, { op1: _state }) => {
  let { manager, state } = check(vm.fetchValue(_state), CheckComponentInstance);
  let bounds = vm.elements().popBlock();

  let mgr = check(manager, CheckInterface({ didRenderLayout: CheckFunction }));

  mgr.didRenderLayout(state, bounds);

  vm.env.didCreate(state, manager);

  vm.updateWith(new DidUpdateLayoutOpcode(manager, state, bounds));
});

APPEND_OPCODES.add(Op.CommitComponentTransaction, vm => {
  vm.commitCacheGroup();
});

export class UpdateComponentOpcode extends UpdatingOpcode {
  public type = 'update-component';

  constructor(
    public tag: Tag,
    private component: ComponentInstanceState,
    private manager: InternalComponentManager,
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
  public tag: Tag = CONSTANT_TAG;

  constructor(
    private manager: InternalComponentManager,
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
