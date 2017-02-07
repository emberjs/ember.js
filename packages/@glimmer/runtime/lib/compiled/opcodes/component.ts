import { OpcodeJSON, UpdatingOpcode } from '../../opcodes';
import { Assert } from './vm';
import { Component, ComponentManager, ComponentDefinition, Arguments as IArguments } from '../../component/interfaces';
import { UpdatingVM, VM } from '../../vm';
import { EvaluatedArgs } from '../../compiled/expressions/args';
import { DynamicScope } from '../../environment';
import Bounds from '../../bounds';
import { APPEND_OPCODES, Op as Op } from '../../opcodes';
import { ComponentElementOperations } from './dom';
import { Opaque, Dict, dict } from '@glimmer/util';
import {
  CONSTANT_TAG,
  ReferenceCache,
  VersionedPathReference,
  Tag,
  combine,
  combineTagged,
  isConst
} from '@glimmer/reference';

APPEND_OPCODES.add(Op.PushComponentManager, (vm, { op1: _definition }) => {
  let definition = vm.constants.getOther<ComponentDefinition<Opaque>>(_definition);
  let stack = vm.evalStack;

  stack.push(definition);
  stack.push(definition.manager);
});

APPEND_OPCODES.add(Op.PushDynamicComponentManager, (vm, { op1: local }) => {
  let reference = vm.getLocal<VersionedPathReference<ComponentDefinition<Opaque>>>(local);
  let cache = isConst(reference) ? undefined : new ReferenceCache<ComponentDefinition<Opaque>>(reference);
  let definition = cache ? cache.peek() : reference.value();

  vm.evalStack.push(definition);
  vm.evalStack.push(definition.manager);

  if (cache) {
    vm.updateWith(new Assert(cache));
  }
});

export class NamedArguments {
  private named: string[] = null as any;
  public tag: Tag = null as any;

  constructor(private args: Arguments) {}

  setup(named: string[]) {
    this.named = named;
    this.tag = this.args.tag;
  }

  value(): Dict<Opaque> {
    let out = dict<Opaque>();
    let args = this.args;

    this.named.forEach(n => out[n] = args.get(n).value());

    return out;
  }

  get(name: string): VersionedPathReference<Opaque> {
    return this.args.get(name);
  }
}

export class Arguments implements IArguments {
  private positionalCount = 0;
  private namedCount = 0;
  private start = 0;
  private namedDict: Dict<number> = null as any;
  private vm: VM = null as any;

  public named = new NamedArguments(this);
  public tag: Tag = null as any;

  setup(positional: number, named: number, namedDict: Dict<number>, vm: VM) {
    this.positionalCount = positional;
    this.namedCount = named;
    this.namedDict = namedDict;
    this.start = positional + named;
    this.vm = vm;

    let references = vm.evalStack.slice<VersionedPathReference<Opaque>[]>(positional + named);
    this.tag = combineTagged(references);

    this.named.setup(Object.keys(namedDict));
  }

  at<T extends VersionedPathReference<Opaque>>(pos: number): T {
    // stack: pos1, pos2, pos3, named1, named2
    // start: 4 (top - 4)
    //
    // at(0) === pos1 === top - start
    // at(1) === pos2 === top - (start - 1)
    // at(2) === pos3 === top - (start - 2)
    let fromTop = this.start - pos;
    return this.vm.evalStack.fromTop<T>(fromTop);
  }

  get<T extends VersionedPathReference<Opaque>>(name: string): T {
    // stack: pos1, pos2, pos3, named1, named2
    // start: 4 (top - 4)
    // namedDict: { named1: 1, named2: 0 };
    //
    // get('named1') === named1 === top - (start - 1)
    // get('named2') === named2 === top - start
    let fromTop = this.namedDict[name];
    return this.vm.evalStack.fromTop<T>(fromTop);
  }
}

const ARGS = new Arguments();

interface InitialComponentState<T> {
  definition: ComponentDefinition<T>;
  manager: ComponentManager<T>;
  component: null;
}

interface ComponentState<T> {
  definition: ComponentDefinition<T>;
  manager: ComponentManager<T>;
  component: T;
}

APPEND_OPCODES.add(Op.SetComponentState, (vm, { op1: local }) => {
  let stack = vm.evalStack;

  let manager = stack.pop();
  let definition = stack.pop();

  vm.setLocal(local, { definition, manager, component: null });
});

APPEND_OPCODES.add(Op.PushComponentArgs, (vm, { op1: positional, op2: named, op3: _namedDict }) => {
  let namedDict = vm.constants.getOther<Dict<number>>(_namedDict);
  ARGS.setup(positional, named, namedDict, vm);
  vm.evalStack.push(ARGS);
});

APPEND_OPCODES.add(Op.CreateComponent, (vm, { op1: flags, op2: _state }) => {
  let definition, manager;
  let args = vm.evalStack.pop<Arguments>();
  let state = { definition, manager } = vm.getLocal<InitialComponentState<Opaque>>(_state);

  let hasDefaultBlock = flags & 0b01;

  let component = manager.create(vm.env, definition, args, vm.dynamicScope(), vm.getSelf(), !!hasDefaultBlock);
  (state as ComponentState<typeof component>).component = component;
});

APPEND_OPCODES.add(Op.RegisterComponentDestructor, (vm, { op1: _state }) => {
  let { manager, component } = vm.getLocal<ComponentState<Opaque>>(_state);

  let destructor = manager.getDestructor(component);
  if (destructor) vm.newDestroyable(destructor);
});

APPEND_OPCODES.add(Op.BeginComponentTransaction, vm => {
  vm.beginCacheGroup();
  vm.stack().pushSimpleBlock();
});

APPEND_OPCODES.add(Op.PushComponentOperations, vm => {
  vm.evalStack.push(new ComponentElementOperations(vm.env));
});

APPEND_OPCODES.add(Op.DidCreateElement, (vm, { op1: _state }) => {
  let { manager, component } = vm.getLocal<ComponentState<Opaque>>(_state);

  let action = 'DidCreateElementOpcode#evaluate';
  manager.didCreateElement(component, vm.stack().expectConstructing(action), vm.stack().expectOperations(action));
});

APPEND_OPCODES.add(Op.GetComponentSelf, (vm, { op1: _state }) => {
  let state = vm.getLocal<ComponentState<Opaque>>(_state);
  vm.evalStack.push(state.manager.getSelf(state.component));
});

APPEND_OPCODES.add(Op.GetComponentLayout, (vm, { op1: _state }) => {
  let { manager, definition, component } = vm.getLocal<ComponentState<Opaque>>(_state);
  vm.evalStack.push(manager.layoutFor(definition, component, vm.env));
});

// Slow path for non-specialized component invocations. Uses an internal
// named lookup on the args.
APPEND_OPCODES.add(Op.ShadowAttributes, vm => {
  let shadow = vm.frame.getShadow();

  vm.pushCallerScope();
  if (!shadow) return;

  vm.invokeBlock(shadow);
});

APPEND_OPCODES.add(Op.DidRenderLayout, (vm, { op1: _state }) => {
  let { manager, component } = vm.getLocal<ComponentState<Opaque>>(_state);
  let bounds = vm.stack().popBlock();

  manager.didRenderLayout(component, bounds);

  vm.env.didCreate(component, manager);

  vm.updateWith(new DidUpdateLayoutOpcode(manager, component, bounds));
});

APPEND_OPCODES.add(Op.CommitComponentTransaction, vm => vm.commitCacheGroup());

export class UpdateComponentOpcode extends UpdatingOpcode {
  public type = "update-component";

  constructor(
    private name: string,
    private component: Component,
    private manager: ComponentManager<Component>,
    private args: EvaluatedArgs,
    private dynamicScope: DynamicScope,
  ) {
    super();

    let componentTag = manager.getTag(component);

    if (componentTag) {
      this.tag = combine([args.tag, componentTag]);
    } else {
      this.tag = args.tag;
    }
  }

  evaluate(_vm: UpdatingVM) {
    let { component, manager, args, dynamicScope } = this;

    manager.update(component, args, dynamicScope);
  }

  toJSON(): OpcodeJSON {
    return {
      guid: this._guid,
      type: this.type,
      args: [JSON.stringify(this.name)]
    };
  }
}

export class DidUpdateLayoutOpcode extends UpdatingOpcode {
  public type = "did-update-layout";
  public tag: Tag = CONSTANT_TAG;

  constructor(
    private manager: ComponentManager<Component>,
    private component: Component,
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
