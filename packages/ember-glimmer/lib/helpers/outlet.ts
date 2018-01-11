import { ConstReference, Reference, Tag, VersionedPathReference } from '@glimmer/reference';
import {
  Arguments,
  CurriedComponentDefinition,
  curry,
  UNDEFINED_REFERENCE,
  VM,
} from '@glimmer/runtime';
import { OutletComponentDefinition, OutletDefinitionState } from '../component-managers/outlet';
import { DynamicScope } from '../renderer';
import { OutletReference, OutletState } from '../utils/outlet';

export default function outlet(vm: VM, args: Arguments) {
  let scope = vm.dynamicScope() as DynamicScope;
  let nameRef: Reference<string>;
  if (args.positional.length === 0) {
    nameRef = new ConstReference('main');
  } else {
    nameRef = args.positional.at<VersionedPathReference<string>>(0);
  }
  return new OutletComponentReference(new OutletReference(scope.outletState, nameRef));
}

class OutletComponentReference implements VersionedPathReference<CurriedComponentDefinition | null> {
  public tag: Tag;
  private definition: CurriedComponentDefinition | null;
  private lastState: OutletDefinitionState | null;

  constructor(private outletRef: VersionedPathReference<OutletState | undefined>) {
    this.definition = null;
    this.lastState = null;
    // The router always dirties the root state.
    this.tag = outletRef.tag;
  }

  value(): CurriedComponentDefinition | null {
    let state = stateFor(this.outletRef);
    if (validate(state, this.lastState)) {
      return this.definition;
    }
    this.lastState = state;
    let definition = null;
    if (state !== null) {
      definition = curry(new OutletComponentDefinition(state));
    }
    return this.definition = definition;
  }

  get(_key: string) {
    return UNDEFINED_REFERENCE;
  }
}

function stateFor(ref: VersionedPathReference<OutletState | undefined>): OutletDefinitionState | null {
  let outlet = ref.value();
  if (outlet === undefined) return null;
  let render = outlet.render;
  if (render === undefined) return null;
  let template = render.template;
  if (template === undefined) return null;
  return {
    ref,
    name: render.name,
    outlet: render.outlet,
    template,
    controller: render.controller,
  };
}

function validate(state: OutletDefinitionState | null, lastState: OutletDefinitionState | null) {
  if (state === null) {
    return lastState === null;
  }
  if (lastState === null) {
    return false;
  }
  return state.template === lastState.template &&
         state.controller === lastState.controller;
}
