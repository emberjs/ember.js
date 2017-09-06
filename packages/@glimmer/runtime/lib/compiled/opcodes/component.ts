import { Opaque, Option, Dict, ProgramSymbolTable, Recast, RuntimeResolver, Unique } from '@glimmer/interfaces';
import {
  combineTagged,
  CONSTANT_TAG,
  Tag,
  VersionedReference,
  VersionedPathReference,
  isConst,
  isConstTag
} from '@glimmer/reference';
import Bounds from '../../bounds';
import {
  CurriedComponentDefinition,
  hasDynamicLayout,
  hasStaticLayout,
  isCurriedComponentDefinition,
  WithDynamicTagName,
  WithElementHook,
  ComponentSpec,
  PublicComponentSpec
} from '../../component/interfaces';
import { normalizeStringValue } from '../../dom/normalize';
import { DynamicScope, ScopeBlock, ScopeSlot } from '../../environment';
import { APPEND_OPCODES, UpdatingOpcode } from '../../opcodes';
import { UNDEFINED_REFERENCE } from '../../references';
import { UpdatingVM, VM } from '../../vm';
import { Arguments, IArguments, ICapturedArguments } from '../../vm/arguments';
import { IsCurriedComponentDefinitionReference } from './content';
import { UpdateDynamicAttributeOpcode } from './dom';
import { ComponentDefinition, ComponentManager, Component } from '../../internal-interfaces';
import { dict, assert, unreachable, check, expectStackChange, CheckInstanceof, CheckFunction, CheckInterface, CheckProgramSymbolTable, CheckHandle, CheckOption, CheckBlockSymbolTable, CheckOr } from "@glimmer/util";
import { Op, Register } from '@glimmer/vm';
import { TemplateMeta } from "@glimmer/wire-format";
import { ATTRS_BLOCK, VMHandle } from '@glimmer/opcode-compiler';
import { CheckReference, CheckArguments, CheckPathReference, CheckComponentState, CheckCompilableBlock } from './__DEBUG__';

const ARGS = new Arguments();

function resolveComponent<Specifier>(resolver: RuntimeResolver<Specifier>, name: string, meta: Specifier): Option<ComponentSpec> {
  let spec = resolver.lookupComponent(name, meta);
  assert(spec, `Could not find a component named "${name}"`);
  return spec as ComponentSpec;
}

export function curry(spec: PublicComponentSpec, args: Option<ICapturedArguments> = null): CurriedComponentDefinition {
  return new CurriedComponentDefinition(spec as ComponentSpec, args);
}

class CurryComponentReference<Specifier> implements VersionedPathReference<Option<CurriedComponentDefinition>> {
  public tag: Tag;
  private lastValue: Opaque;
  private lastDefinition: Option<CurriedComponentDefinition>;

  constructor(
    private inner: VersionedReference<Opaque>,
    private resolver: RuntimeResolver<Specifier>,
    private meta: Specifier,
    private args: Option<ICapturedArguments>
  ) {
    this.tag = inner.tag;
    this.lastValue = null;
    this.lastDefinition = null;
  }

  value(): Option<CurriedComponentDefinition> {
    let { inner, lastValue } = this;

    let value = inner.value();

    if (value === lastValue) {
      return this.lastDefinition;
    }

    let definition: Option<CurriedComponentDefinition | ComponentSpec> = null;

    if (isCurriedComponentDefinition(value)) {
      definition = value;
    } else if (typeof value === 'string' && value) {
      let { resolver, meta } = this;
      definition = resolveComponent(resolver, value, meta);
    }

    definition = this.curry(definition);

    this.lastValue = value;
    this.lastDefinition = definition;

    return definition;
  }

  get(): VersionedPathReference<Opaque> {
    return UNDEFINED_REFERENCE;
  }

  private curry(definition: Option<CurriedComponentDefinition | ComponentSpec>): Option<CurriedComponentDefinition> {
    let { args } = this;

    if (!args && isCurriedComponentDefinition(definition)) {
      return definition;
    } else if (!definition) {
      return null;
    } else {
      return new CurriedComponentDefinition(definition, args);
    }
  }
}

APPEND_OPCODES.add(Op.IsComponent, vm => {
  let stack = vm.stack;
  let ref = check(stack.pop(), CheckReference);

  stack.push(IsCurriedComponentDefinitionReference.create(ref));

  expectStackChange(vm.stack, 0, 'IsComponent');
});

APPEND_OPCODES.add(Op.CurryComponent, (vm, { op1: _meta }) => {
  let stack = vm.stack;

  let args = check(stack.pop(), CheckArguments);
  let captured: Option<ICapturedArguments> = null;

  if (args.length) {
    captured = args.capture();
    args.clear();
  }

  let meta = vm.constants.getSerializable<TemplateMeta>(_meta);
  let resolver = vm.constants.resolver;
  let definition = check(stack.pop(), CheckReference);

  stack.push(new CurryComponentReference(definition, resolver, meta, captured));

  expectStackChange(vm.stack, -args.length - 1, 'CurryComponent');
});

APPEND_OPCODES.add(Op.PushComponentSpec, (vm, { op1: handle }) => {
  let spec = vm.constants.resolveHandle<ComponentSpec>(handle);

  assert(!!spec, `Missing component for ${handle} (TODO: env.specifierForHandle)`);

  let stack = vm.stack;

  let { definition, manager } = spec;
  stack.push({ definition, manager, component: null });

  expectStackChange(vm.stack, 1, 'PushComponentSpec');
});

APPEND_OPCODES.add(Op.PushDynamicComponentManager, (vm, { op1: _meta }) => {
  let stack = vm.stack;

  let component = check(stack.pop(), CheckPathReference).value();
  let definition: ComponentSpec['definition'] | CurriedComponentDefinition;
  let manager: Option<ComponentSpec['manager']> = null;

  if (typeof component === 'string') {
    let { constants, constants: { resolver } } = vm;
    let meta = constants.getSerializable<TemplateMeta>(_meta);
    let spec = resolveComponent(resolver, component, meta);

    assert(!!spec, `Could not find a component named "${component}"`);

    definition = spec!.definition;
    manager = spec!.manager;

    assert(definition && manager, 'missing definition or manager');
  } else if (isCurriedComponentDefinition(component)) {
    definition = component;
  } else {
    throw unreachable();
  }

  stack.push({ definition, manager, component: null });

  expectStackChange(vm.stack, 0, 'PushDynamicComponentManager');
});

interface InitialComponentState {
  definition: ComponentDefinition;
  manager: Option<ComponentManager>;
  component: null;
}

interface PopulatedComponentState {
  definition: ComponentDefinition;
  manager: ComponentManager;
  component: null;
}

interface ComponentState {
  definition: ComponentDefinition;
  manager: ComponentManager;
  component: Component;
}

APPEND_OPCODES.add(Op.PushArgs, (vm, { op1: _names, op2: positionalCount, op3: synthetic }) => {
  let stack = vm.stack;
  let names = vm.constants.getStringArray(_names);
  ARGS.setup(stack, names, positionalCount, !!synthetic);
  stack.push(ARGS);

  expectStackChange(vm.stack, 1, 'PushArgs');
});

APPEND_OPCODES.add(Op.PrepareArgs, (vm, { op1: _state }) => {
  let stack = vm.stack;
  let state = vm.fetchValue<InitialComponentState>(_state);

  let { definition, manager } = state;
  let args: Arguments;
  let debugCount = 0;

  if (isCurriedComponentDefinition(definition)) {
    assert(!manager, "If the component definition was curried, we don't yet have a manager");

    args = check(stack.pop(), CheckInstanceof(Arguments));

    let { manager: curriedManager, definition: curriedDefinition } = definition.unwrap(args);
    state.manager = manager = curriedManager as ComponentManager;
    state.definition = definition = curriedDefinition;
  } else {
    args = check(stack.pop(), CheckInstanceof(Arguments));
  }

  debugCount--;

  if (manager!.getCapabilities(definition).prepareArgs !== true) {
    stack.push(args);
    return;
  }

  let preparedArgs = manager!.prepareArgs(definition, args);

  if (preparedArgs) {
    args.clear();

    let { positional, named } = preparedArgs;

    let positionalCount = positional.length;

    for (let i = 0; i < positionalCount; i++) {
      stack.push(positional[i]);
    }

    let names = Object.keys(named);

    for (let i = 0; i < names.length; i++) {
      stack.push(named[names[i]]);
    }

    args.setup(stack, names, positionalCount, true);
  }

  stack.push(args);

  // TODO: Compute the expected stack change correctly
});

APPEND_OPCODES.add(Op.CreateComponent, (vm, { op1: flags, op2: _state }) => {
  let definition: ComponentDefinition;
  let manager: ComponentManager;
  let dynamicScope = vm.dynamicScope();
  let state = { definition, manager } = vm.fetchValue<PopulatedComponentState>(_state);

  let hasDefaultBlock = flags & 1;

  let args: Option<IArguments> = null;

  if (manager.getCapabilities(definition).createArgs) {
    args = check(vm.stack.peek(), CheckArguments);
  }

  let component = manager.create(vm.env, definition, args, dynamicScope, vm.getSelf(), !!hasDefaultBlock);

  // We want to reuse the `state` POJO here, because we know that the opcodes
  // only transition at exactly one place.
  (state as Recast<InitialComponentState, ComponentState>).component = component;

  let tag = manager.getTag(component);

  if (!isConstTag(tag)) {
    vm.updateWith(new UpdateComponentOpcode(tag, component, manager, dynamicScope));
  }

  expectStackChange(vm.stack, 0, 'CreateComponent');
});

APPEND_OPCODES.add(Op.RegisterComponentDestructor, (vm, { op1: _state }) => {
  let { manager: uncheckedManager, component } = check(vm.fetchValue(_state), CheckComponentState);

  let manager = check(uncheckedManager, CheckInterface<ComponentManager>({ getDestructor: CheckFunction }));
  let destructor = manager.getDestructor(component as Unique<'Component'>);
  if (destructor) vm.newDestroyable(destructor);

  expectStackChange(vm.stack, 0, 'RegisterComponentDestructor');
});

APPEND_OPCODES.add(Op.BeginComponentTransaction, vm => {
  vm.beginCacheGroup();
  vm.elements().pushSimpleBlock();

  expectStackChange(vm.stack, 0, 'BeginComponentTransaction');
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

  expectStackChange(vm.stack, -1, 'ComponentAttr');
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
  let { manager, component } = vm.fetchValue<ComponentState>(_state);
  let operations = check(vm.fetchValue(Register.t0), CheckInstanceof(ComponentElementOperations));

  let action = 'DidCreateElementOpcode#evaluate';
  (manager as WithElementHook<Component>).didCreateElement(component, vm.elements().expectConstructing(action), operations);

  expectStackChange(vm.stack, 0, 'DidCreateElement');
});

APPEND_OPCODES.add(Op.GetComponentSelf, (vm, { op1: _state }) => {
  let { manager, component } = vm.fetchValue<ComponentState>(_state);
  vm.stack.push(manager.getSelf(component));

  expectStackChange(vm.stack, 1, 'GetComponentSelf');
});

APPEND_OPCODES.add(Op.GetComponentTagName, (vm, { op1: _state }) => {
  let { manager, component } = vm.fetchValue<ComponentState>(_state);
  vm.stack.push((manager as Recast<ComponentManager, WithDynamicTagName<Component>>).getTagName(component));

  expectStackChange(vm.stack, 1, 'GetComponentTagName');
});

// Dynamic Invocation Only
APPEND_OPCODES.add(Op.GetComponentLayout, (vm, { op1: _state }) => {
  let { manager, definition, component } = vm.fetchValue<ComponentState>(_state);
  let { constants: { resolver }, stack } = vm;
  let invoke: { handle: VMHandle, symbolTable: ProgramSymbolTable };

  if (hasStaticLayout(definition, manager)) {
    invoke = manager.getLayout(definition, resolver);
  } else if (hasDynamicLayout(definition, manager)) {
    invoke = manager.getLayout(component, resolver);
  } else {
    throw unreachable();
  }

  stack.push(invoke.symbolTable);
  stack.push(invoke.handle);
});

// Dynamic Invocation Only
APPEND_OPCODES.add(Op.InvokeComponentLayout, vm => {
  let { stack } = vm;

  let handle = check(stack.pop(), CheckHandle);
  let { symbols, hasEval } = check(stack.pop(), CheckProgramSymbolTable);

  {
    let scope = vm.pushRootScope(symbols.length + 1, true);
    scope.bindSelf(check(stack.pop(), CheckPathReference));

    let args = check(vm.stack.pop(), CheckArguments);

    let lookup: Option<Dict<ScopeSlot>> = null;
    let $eval: Option<number> = -1;

    if (hasEval) {
      $eval = symbols.indexOf('$eval') + 1;
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

    args.clear();

    let bindBlock = (name: string) => {
      let symbol = symbols.indexOf(name);
      let handle = check(stack.pop(), CheckOr(CheckOption(CheckHandle), CheckOption(CheckCompilableBlock)));
      let table = check(stack.pop(), CheckOption(CheckBlockSymbolTable));

      let block: Option<ScopeBlock> = table ? [handle!, table] : null;

      if (symbol !== -1) {
        scope.bindBlock(symbol + 1, block);
      }

      if (lookup) lookup[name] = block;
    };

    bindBlock(ATTRS_BLOCK);
    bindBlock('&inverse');
    bindBlock('&default');

    if (lookup) scope.bindEvalScope(lookup);

    vm.pushFrame();
    vm.call(handle!);
  }
});

APPEND_OPCODES.add(Op.DidRenderLayout, (vm, { op1: _state }) => {
  let { manager, component } = vm.fetchValue<ComponentState>(_state);
  let bounds = vm.elements().popBlock();

  manager.didRenderLayout(component, bounds);

  vm.env.didCreate(component, manager);

  vm.updateWith(new DidUpdateLayoutOpcode(manager, component, bounds));

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
    private manager: ComponentManager,
    private dynamicScope: DynamicScope,
  ) {
    super();
  }

  evaluate(_vm: UpdatingVM<Opaque>) {
    let { component, manager, dynamicScope } = this;

    manager.update(component, dynamicScope);
  }
}

export class DidUpdateLayoutOpcode extends UpdatingOpcode {
  public type = 'did-update-layout';
  public tag: Tag = CONSTANT_TAG;

  constructor(
    private manager: ComponentManager,
    private component: Component,
    private bounds: Bounds,
  ) {
    super();
  }

  evaluate(vm: UpdatingVM<Opaque>) {
    let { manager, component, bounds } = this;

    manager.didUpdateLayout(component, bounds);

    vm.env.didUpdate(component, manager);
  }
}
