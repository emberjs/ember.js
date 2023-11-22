import type {
  Bounds,
  CapabilityMask,
  CapturedArguments,
  CompilableProgram,
  ComponentDefinition,
  ComponentDefinitionState,
  ComponentInstance,
  ComponentInstanceState,
  ComponentInstanceWithCreate,
  Dict,
  DynamicScope,
  ElementOperations,
  InternalComponentManager,
  ModifierInstance,
  Nullable,
  Owner,
  ProgramSymbolTable,
  Recast,
  ScopeSlot,
  UpdatingOpcode,
  VMArguments,
  WithDynamicTagName,
  WithElementHook,
  WithUpdateHook,
} from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference';
import {
  check,
  CheckFunction,
  CheckHandle,
  CheckInstanceof,
  CheckInterface,
  CheckOr,
  CheckProgramSymbolTable,
  CheckString,
} from '@glimmer/debug';
import { registerDestructor } from '@glimmer/destroyable';
import { managerHasCapability } from '@glimmer/manager';
import { isConstRef, valueForRef } from '@glimmer/reference';
import {
  assert,
  assign,
  debugToString,
  dict,
  EMPTY_STRING_ARRAY,
  enumerate,
  expect,
  unwrap,
  unwrapTemplate,
} from '@glimmer/util';
import { $t0, $t1, CurriedTypes, InternalComponentCapabilities, Op } from '@glimmer/vm';

import type { CurriedValue } from '../../curried-value';
import type { UpdatingVM } from '../../vm';
import type { InternalVM } from '../../vm/append';
import type { BlockArgumentsImpl } from '../../vm/arguments';

import { hasCustomDebugRenderTreeLifecycle } from '../../component/interfaces';
import { resolveComponent } from '../../component/resolve';
import { isCurriedType, isCurriedValue, resolveCurriedValue } from '../../curried-value';
import { APPEND_OPCODES } from '../../opcodes';
import createClassListRef from '../../references/class-list';
import { ARGS, CONSTANTS } from '../../symbols';
import { EMPTY_ARGS, VMArgumentsImpl } from '../../vm/arguments';
import {
  CheckArguments,
  CheckComponentDefinition,
  CheckComponentInstance,
  CheckCurriedComponentDefinition,
  CheckFinishedComponentInstance,
  CheckInvocation,
  CheckReference,
} from './-debug-strip';
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

export interface InitialComponentInstance {
  definition: ComponentDefinition;
  manager: Nullable<InternalComponentManager>;
  capabilities: Nullable<CapabilityMask>;
  state: null;
  handle: Nullable<number>;
  table: Nullable<ProgramSymbolTable>;
  lookup: Nullable<Dict<ScopeSlot>>;
}

export interface PopulatedComponentInstance {
  definition: ComponentDefinition;
  manager: InternalComponentManager;
  capabilities: CapabilityMask;
  state: null;
  handle: number;
  table: Nullable<ProgramSymbolTable>;
  lookup: Nullable<Dict<ScopeSlot>>;
}

export interface PartialComponentDefinition {
  state: Nullable<ComponentDefinitionState>;
  manager: InternalComponentManager;
}

APPEND_OPCODES.add(Op.PushComponentDefinition, (vm, { op1: handle }) => {
  let definition = vm[CONSTANTS].getValue<ComponentDefinition>(handle);
  assert(!!definition, `Missing component for ${handle}`);

  let { manager, capabilities } = definition;

  let instance: InitialComponentInstance = {
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

APPEND_OPCODES.add(Op.ResolveDynamicComponent, (vm, { op1: _isStrict }) => {
  let stack = vm.stack;
  let component = check(
    valueForRef(check(stack.pop(), CheckReference)),
    CheckOr(CheckString, CheckCurriedComponentDefinition)
  );
  let constants = vm[CONSTANTS];
  let owner = vm.getOwner();
  let isStrict = constants.getValue<boolean>(_isStrict);

  vm.loadValue($t1, null); // Clear the temp register

  let definition: ComponentDefinition | CurriedValue;

  if (typeof component === 'string') {
    if (import.meta.env.DEV && isStrict) {
      throw new Error(
        `Attempted to resolve a dynamic component with a string definition, \`${component}\` in a strict mode template. In strict mode, using strings to resolve component definitions is prohibited. You can instead import the component definition and use it directly.`
      );
    }

    let resolvedDefinition = resolveComponent(vm.runtime.resolver, constants, component, owner);

    definition = expect(resolvedDefinition, `Could not find a component named "${component}"`);
  } else if (isCurriedValue(component)) {
    definition = component;
  } else {
    definition = constants.component(component, owner);
  }

  stack.push(definition);
});

APPEND_OPCODES.add(Op.ResolveCurriedComponent, (vm) => {
  let stack = vm.stack;
  let ref = check(stack.pop(), CheckReference);
  let value = valueForRef(ref);
  let constants = vm[CONSTANTS];

  let definition: CurriedValue | ComponentDefinition | null;

  if (
    import.meta.env.DEV &&
    !(typeof value === 'function' || (typeof value === 'object' && value !== null))
  ) {
    throw new Error(
      `Expected a component definition, but received ${value}. You may have accidentally done <${ref.debugLabel}>, where "${ref.debugLabel}" was a string instead of a curried component definition. You must either use the component definition directly, or use the {{component}} helper to create a curried component definition when invoking dynamically.`
    );
  }

  if (isCurriedValue(value)) {
    definition = value;
  } else {
    definition = constants.component(value as object, vm.getOwner(), true);

    if (import.meta.env.DEV && definition === null) {
      throw new Error(
        `Expected a dynamic component definition, but received an object or function that did not have a component manager associated with it. The dynamic invocation was \`<${
          ref.debugLabel
        }>\` or \`{{${
          ref.debugLabel
        }}}\`, and the incorrect definition is the value at the path \`${
          ref.debugLabel
        }\`, which was: ${debugToString!(value)}`
      );
    }
  }

  stack.push(definition);
});

APPEND_OPCODES.add(Op.PushDynamicComponentInstance, (vm) => {
  let { stack } = vm;
  let definition = stack.pop<ComponentDefinition>();

  let capabilities, manager;

  if (isCurriedValue(definition)) {
    manager = capabilities = null;
  } else {
    manager = definition.manager;
    capabilities = definition.capabilities;
  }

  stack.push({ definition, capabilities, manager, state: null, handle: null, table: null });
});

APPEND_OPCODES.add(Op.PushArgs, (vm, { op1: _names, op2: _blockNames, op3: flags }) => {
  let stack = vm.stack;
  let names = vm[CONSTANTS].getArray<string>(_names);

  let positionalCount = flags >> 4;
  let atNames = flags & 0b1000;
  let blockNames =
    flags & 0b0111 ? vm[CONSTANTS].getArray<string>(_blockNames) : EMPTY_STRING_ARRAY;

  vm[ARGS].setup(stack, names, blockNames, positionalCount, !!atNames);
  stack.push(vm[ARGS]);
});

APPEND_OPCODES.add(Op.PushEmptyArgs, (vm) => {
  let { stack } = vm;

  stack.push(vm[ARGS].empty(stack));
});

APPEND_OPCODES.add(Op.CaptureArgs, (vm) => {
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

  if (isCurriedType(definition, CurriedTypes.Component)) {
    assert(
      !definition.manager,
      "If the component definition was curried, we don't yet have a manager"
    );

    let constants = vm[CONSTANTS];

    let {
      definition: resolvedDefinition,
      owner,
      resolved,
      positional,
      named,
    } = resolveCurriedValue(definition);

    if (resolved === true) {
      definition = resolvedDefinition as ComponentDefinition;
    } else if (typeof resolvedDefinition === 'string') {
      let resolvedValue = vm.runtime.resolver.lookupComponent(resolvedDefinition, owner);

      definition = constants.resolvedComponent(
        expect(resolvedValue, 'BUG: expected resolved component'),
        resolvedDefinition
      );
    } else {
      definition = constants.component(resolvedDefinition, owner);
    }

    if (named !== undefined) {
      args.named.merge(assign({}, ...named));
    }

    if (positional !== undefined) {
      args.realloc(positional.length);
      args.positional.prepend(positional);
    }

    let { manager } = definition;

    assert(instance.manager === null, 'component instance manager should not be populated yet');
    assert(
      instance.capabilities === null,
      'component instance manager should not be populated yet'
    );

    instance.definition = definition;
    instance.manager = manager;
    instance.capabilities = definition.capabilities;

    // Save off the owner that this component was curried with. Later on,
    // we'll fetch the value of this register and set it as the owner on the
    // new root scope.
    vm.loadValue($t1, owner);
  }

  let { manager, state } = definition;
  let capabilities = instance.capabilities;

  if (!managerHasCapability(manager, capabilities, InternalComponentCapabilities.prepareArgs)) {
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
      stack.push(named[unwrap(names[i])]);
    }

    args.setup(stack, names, blockNames, positionalCount, false);
  }

  stack.push(args);
});

APPEND_OPCODES.add(Op.CreateComponent, (vm, { op1: flags, op2: _state }) => {
  let instance = check(vm.fetchValue(_state), CheckComponentInstance);
  let { definition, manager, capabilities } = instance;

  if (!managerHasCapability(manager, capabilities, InternalComponentCapabilities.createInstance)) {
    // TODO: Closure and Main components are always invoked dynamically, so this
    // opcode may run even if this capability is not enabled. In the future we
    // should handle this in a better way.
    return;
  }

  let dynamicScope: Nullable<DynamicScope> = null;
  if (managerHasCapability(manager, capabilities, InternalComponentCapabilities.dynamicScope)) {
    dynamicScope = vm.dynamicScope();
  }

  let hasDefaultBlock = flags & 1;
  let args: Nullable<VMArguments> = null;

  if (managerHasCapability(manager, capabilities, InternalComponentCapabilities.createArgs)) {
    args = check(vm.stack.peek(), CheckArguments);
  }

  let self: Nullable<Reference> = null;
  if (managerHasCapability(manager, capabilities, InternalComponentCapabilities.createCaller)) {
    self = vm.getSelf();
  }

  let state = manager.create(
    vm.getOwner(),
    definition.state,
    args,
    vm.env,
    dynamicScope,
    self,
    !!hasDefaultBlock
  );

  // We want to reuse the `state` POJO here, because we know that the opcodes
  // only transition at exactly one place.
  instance.state = state;

  if (managerHasCapability(manager, capabilities, InternalComponentCapabilities.updateHook)) {
    vm.updateWith(new UpdateComponentOpcode(state, manager, dynamicScope));
  }
});

APPEND_OPCODES.add(Op.RegisterComponentDestructor, (vm, { op1: _state }) => {
  let { manager, state, capabilities } = check(vm.fetchValue(_state), CheckComponentInstance);

  let d = manager.getDestroyable(state);

  if (
    import.meta.env.DEV &&
    !managerHasCapability(manager, capabilities, InternalComponentCapabilities.willDestroy) &&
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

  if (import.meta.env.DEV) {
    let { definition, manager } = check(vm.fetchValue(_state), CheckComponentInstance);

    name = definition.resolvedName ?? manager.getDebugName(definition.state);
  }

  vm.beginCacheGroup(name);
  vm.elements().pushSimpleBlock();
});

APPEND_OPCODES.add(Op.PutComponentOperations, (vm) => {
  vm.loadValue($t0, new ComponentElementOperations());
});

APPEND_OPCODES.add(Op.ComponentAttr, (vm, { op1: _name, op2: _trusting, op3: _namespace }) => {
  let name = vm[CONSTANTS].getValue<string>(_name);
  let trusting = vm[CONSTANTS].getValue<boolean>(_trusting);
  let reference = check(vm.stack.pop(), CheckReference);
  let namespace = _namespace ? vm[CONSTANTS].getValue<string>(_namespace) : null;

  check(vm.fetchValue($t0), CheckInstanceof(ComponentElementOperations)).setAttribute(
    name,
    reference,
    trusting,
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
  namespace: Nullable<string>;
  trusting?: boolean;
};

export class ComponentElementOperations implements ElementOperations {
  private attributes = dict<DeferredAttribute>();
  private classes: (string | Reference<unknown>)[] = [];
  private modifiers: ModifierInstance[] = [];

  setAttribute(
    name: string,
    value: Reference<unknown>,
    trusting: boolean,
    namespace: Nullable<string>
  ) {
    let deferred = { value, namespace, trusting };

    if (name === 'class') {
      this.classes.push(value);
    }

    this.attributes[name] = deferred;
  }

  setStaticAttribute(name: string, value: string, namespace: Nullable<string>): void {
    let deferred = { value, namespace };

    if (name === 'class') {
      this.classes.push(value);
    }

    this.attributes[name] = deferred;
  }

  addModifier(modifier: ModifierInstance): void {
    this.modifiers.push(modifier);
  }

  flush(vm: InternalVM): ModifierInstance[] {
    let type: DeferredAttribute | undefined;
    let attributes = this.attributes;

    for (let name in this.attributes) {
      if (name === 'type') {
        type = attributes[name];
        continue;
      }

      let attr = unwrap(this.attributes[name]);
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
    return unwrap(classes[0]);
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
  vm: InternalVM,
  name: string,
  value: string | Reference<unknown>,
  namespace: Nullable<string>,
  trusting = false
) {
  if (typeof value === 'string') {
    vm.elements().setStaticAttribute(name, value, namespace);
  } else {
    let attribute = vm
      .elements()
      .setDynamicAttribute(name, valueForRef(value), trusting, namespace);
    if (!isConstRef(value)) {
      vm.updateWith(new UpdateDynamicAttributeOpcode(value, attribute, vm.env));
    }
  }
}

APPEND_OPCODES.add(Op.DidCreateElement, (vm, { op1: _state }) => {
  let { definition, state } = check(vm.fetchValue(_state), CheckComponentInstance);
  let { manager } = definition;

  let operations = check(vm.fetchValue($t0), CheckInstanceof(ComponentElementOperations));

  (manager as WithElementHook<unknown>).didCreateElement(
    state,
    expect(vm.elements().constructing, `Expected a constructing element in DidCreateOpcode`),
    operations
  );
});

APPEND_OPCODES.add(Op.GetComponentSelf, (vm, { op1: _state, op2: _names }) => {
  let instance = check(vm.fetchValue(_state), CheckComponentInstance);
  let { definition, state } = instance;
  let { manager } = definition;
  let selfRef = manager.getSelf(state);

  if (vm.env.debugRenderTree !== undefined) {
    let instance = check(vm.fetchValue(_state), CheckComponentInstance);
    let { definition, manager } = instance;

    let args: CapturedArguments;

    if (vm.stack.peek() === vm[ARGS]) {
      args = vm[ARGS].capture();
    } else {
      let names = vm[CONSTANTS].getArray<string>(_names);
      vm[ARGS].setup(vm.stack, names, [], 0, true);
      args = vm[ARGS].capture();
    }

    let moduleName: string;
    let compilable: CompilableProgram | null = definition.compilable;

    if (compilable === null) {
      assert(
        managerHasCapability(
          manager,
          instance.capabilities,
          InternalComponentCapabilities.dynamicLayout
        ),
        'BUG: No template was found for this component, and the component did not have the dynamic layout capability'
      );

      compilable = manager.getDynamicLayout(state, vm.runtime.resolver);

      if (compilable !== null) {
        moduleName = compilable.moduleName;
      } else {
        moduleName = '__default__.hbs';
      }
    } else {
      moduleName = compilable.moduleName;
    }

    // For tearing down the debugRenderTree
    vm.associateDestroyable(instance);

    if (hasCustomDebugRenderTreeLifecycle(manager)) {
      let nodes = manager.getDebugCustomRenderTree(
        instance.definition.state,
        instance.state,
        args,
        moduleName
      );

      nodes.forEach((node) => {
        let { bucket } = node;
        vm.env.debugRenderTree!.create(bucket, node);

        registerDestructor(instance, () => {
          vm.env.debugRenderTree?.willDestroy(bucket);
        });

        vm.updateWith(new DebugRenderTreeUpdateOpcode(bucket));
      });
    } else {
      let name = definition.resolvedName ?? manager.getDebugName(definition.state);

      vm.env.debugRenderTree.create(instance, {
        type: 'component',
        name,
        args,
        template: moduleName,
        instance: valueForRef(selfRef),
      });

      vm.associateDestroyable(instance);

      registerDestructor(instance, () => {
        vm.env.debugRenderTree?.willDestroy(instance);
      });

      vm.updateWith(new DebugRenderTreeUpdateOpcode(instance));
    }
  }

  vm.stack.push(selfRef);
});

APPEND_OPCODES.add(Op.GetComponentTagName, (vm, { op1: _state }) => {
  let { definition, state } = check(vm.fetchValue(_state), CheckComponentInstance);
  let { manager } = definition;

  let tagName = (
    manager as Recast<InternalComponentManager, WithDynamicTagName<unknown>>
  ).getTagName(state);

  // User provided value from JS, so we don't bother to encode
  vm.stack.push(tagName);
});

// Dynamic Invocation Only
APPEND_OPCODES.add(Op.GetComponentLayout, (vm, { op1: _state }) => {
  let instance = check(vm.fetchValue(_state), CheckComponentInstance);

  let { manager, definition } = instance;
  let { stack } = vm;

  let { compilable } = definition;

  if (compilable === null) {
    let { capabilities } = instance;

    assert(
      managerHasCapability(manager, capabilities, InternalComponentCapabilities.dynamicLayout),
      'BUG: No template was found for this component, and the component did not have the dynamic layout capability'
    );

    compilable = manager.getDynamicLayout(instance.state, vm.runtime.resolver);

    if (compilable === null) {
      if (managerHasCapability(manager, capabilities, InternalComponentCapabilities.wrapped)) {
        compilable = unwrapTemplate(vm[CONSTANTS].defaultTemplate).asWrappedLayout();
      } else {
        compilable = unwrapTemplate(vm[CONSTANTS].defaultTemplate).asLayout();
      }
    }
  }

  let handle = compilable.compile(vm.context);

  stack.push(compilable.symbolTable);
  stack.push(handle);
});

APPEND_OPCODES.add(Op.Main, (vm, { op1: register }) => {
  let definition = check(vm.stack.pop(), CheckComponentDefinition);
  let invocation = check(vm.stack.pop(), CheckInvocation);

  let { manager, capabilities } = definition;

  let state: PopulatedComponentInstance = {
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

  // In import.meta.env.DEV handles could be ErrHandle objects
  let handle = check(stack.pop(), CheckHandle);
  let table = check(stack.pop(), CheckProgramSymbolTable);

  let state = check(vm.fetchValue(_state), CheckComponentInstance);

  state.handle = handle;
  state.table = table;
});

APPEND_OPCODES.add(Op.VirtualRootScope, (vm, { op1: _state }) => {
  let { table, manager, capabilities, state } = check(
    vm.fetchValue(_state),
    CheckFinishedComponentInstance
  );

  let owner;

  if (managerHasCapability(manager, capabilities, InternalComponentCapabilities.hasSubOwner)) {
    owner = manager.getOwner(state);
    vm.loadValue($t1, null); // Clear the temp register
  } else {
    // Check the temp register to see if an owner was resolved from currying
    owner = vm.fetchValue<Owner | null>($t1);

    if (owner === null) {
      // If an owner wasn't found, default to using the current owner. This
      // will happen for normal dynamic component invocation,
      // e.g. <SomeClassicEmberComponent/>
      owner = vm.getOwner();
    } else {
      // Else the owner was found, so clear the temp register. This will happen
      // if we are loading a curried component, e.g. <@someCurriedComponent/>
      vm.loadValue($t1, null);
    }
  }

  vm.pushRootScope(table.symbols.length + 1, owner);
});

APPEND_OPCODES.add(Op.SetupForEval, (vm, { op1: _state }) => {
  let state = check(vm.fetchValue(_state), CheckFinishedComponentInstance);

  if (state.table.hasEval) {
    let lookup = (state.lookup = dict<ScopeSlot>());
    vm.scope().bindEvalScope(lookup);
  }
});

APPEND_OPCODES.add(Op.SetNamedVariables, (vm, { op1: _state }) => {
  let state = check(vm.fetchValue(_state), CheckFinishedComponentInstance);
  let scope = vm.scope();

  let args = check(vm.stack.peek(), CheckArguments);
  let callerNames = args.named.atNames;

  for (let i = callerNames.length - 1; i >= 0; i--) {
    let atName = unwrap(callerNames[i]);
    let symbol = state.table.symbols.indexOf(atName);
    let value = args.named.get(atName, true);

    if (symbol !== -1) scope.bindSymbol(symbol + 1, value);
    if (state.lookup) state.lookup[atName] = value;
  }
});

function bindBlock(
  symbolName: string,
  blockName: string,
  state: ComponentInstance,
  blocks: BlockArgumentsImpl,
  vm: InternalVM
) {
  let symbol = state.table.symbols.indexOf(symbolName);
  let block = blocks.get(blockName);

  if (symbol !== -1) vm.scope().bindBlock(symbol + 1, block);
  if (state.lookup) state.lookup[symbolName] = block;
}

APPEND_OPCODES.add(Op.SetBlocks, (vm, { op1: _state }) => {
  let state = check(vm.fetchValue(_state), CheckFinishedComponentInstance);
  let { blocks } = check(vm.stack.peek(), CheckArguments);

  for (const [i] of enumerate(blocks.names)) {
    bindBlock(unwrap(blocks.symbolNames[i]), unwrap(blocks.names[i]), state, blocks, vm);
  }
});

// Dynamic Invocation Only
APPEND_OPCODES.add(Op.InvokeComponentLayout, (vm, { op1: _state }) => {
  let state = check(vm.fetchValue(_state), CheckFinishedComponentInstance);

  vm.call(state.handle);
});

APPEND_OPCODES.add(Op.DidRenderLayout, (vm, { op1: _state }) => {
  let instance = check(vm.fetchValue(_state), CheckComponentInstance);
  let { manager, state, capabilities } = instance;
  let bounds = vm.elements().popBlock();

  if (vm.env.debugRenderTree !== undefined) {
    if (hasCustomDebugRenderTreeLifecycle(manager)) {
      let nodes = manager.getDebugCustomRenderTree(instance.definition.state, state, EMPTY_ARGS);

      nodes.reverse().forEach((node) => {
        let { bucket } = node;

        vm.env.debugRenderTree!.didRender(bucket, bounds);

        vm.updateWith(new DebugRenderTreeDidRenderOpcode(bucket, bounds));
      });
    } else {
      vm.env.debugRenderTree.didRender(instance, bounds);

      vm.updateWith(new DebugRenderTreeDidRenderOpcode(instance, bounds));
    }
  }

  if (managerHasCapability(manager, capabilities, InternalComponentCapabilities.createInstance)) {
    let mgr = check(manager, CheckInterface({ didRenderLayout: CheckFunction }));
    mgr.didRenderLayout(state, bounds);

    vm.env.didCreate(instance as ComponentInstanceWithCreate);
    vm.updateWith(new DidUpdateLayoutOpcode(instance as ComponentInstanceWithCreate, bounds));
  }
});

APPEND_OPCODES.add(Op.CommitComponentTransaction, (vm) => {
  vm.commitCacheGroup();
});

export class UpdateComponentOpcode implements UpdatingOpcode {
  constructor(
    private component: ComponentInstanceState,
    private manager: WithUpdateHook,
    private dynamicScope: Nullable<DynamicScope>
  ) {}

  evaluate(_vm: UpdatingVM) {
    let { component, manager, dynamicScope } = this;

    manager.update(component, dynamicScope);
  }
}

export class DidUpdateLayoutOpcode implements UpdatingOpcode {
  constructor(private component: ComponentInstanceWithCreate, private bounds: Bounds) {}

  evaluate(vm: UpdatingVM) {
    let { component, bounds } = this;
    let { manager, state } = component;

    manager.didUpdateLayout(state, bounds);

    vm.env.didUpdate(component);
  }
}

class DebugRenderTreeUpdateOpcode implements UpdatingOpcode {
  constructor(private bucket: object) {}

  evaluate(vm: UpdatingVM) {
    vm.env.debugRenderTree?.update(this.bucket);
  }
}

class DebugRenderTreeDidRenderOpcode implements UpdatingOpcode {
  constructor(private bucket: object, private bounds: Bounds) {}

  evaluate(vm: UpdatingVM) {
    vm.env.debugRenderTree?.didRender(this.bucket, this.bounds);
  }
}
