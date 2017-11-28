import { combine, ConstReference, Reference, RevisionTag, TagWrapper, UpdatableTag, VersionedPathReference } from '@glimmer/reference';
import {
  Arguments,
  CurriedComponentDefinition,
  curry,
  VM,
} from '@glimmer/runtime';
import { OutletComponentDefinition } from '../component-managers/outlet';
import { DynamicScope } from '../renderer';
import { OutletState } from '../views/outlet';

export default function outlet(vm: VM, args: Arguments) {
  let scope = vm.dynamicScope() as DynamicScope;
  let outletNameRef: Reference<string>;
  if (args.positional.length === 0) {
    outletNameRef = new ConstReference('main');
  } else {
    outletNameRef = args.positional.at<VersionedPathReference<string>>(0);
  }
  return new OutletComponentReference(outletNameRef, scope.outletState);
}

class OutletComponentReference implements Reference<CurriedComponentDefinition | null> {
  public tag: TagWrapper<RevisionTag | null>;
  private outletStateTag: TagWrapper<UpdatableTag>;
  private definition: any | null;
  private lastState: any | null;

  constructor(private outletNameRef: Reference<string>,
              private parentOutletStateRef: VersionedPathReference<OutletState | null>) {
    this.outletNameRef = outletNameRef;
    this.parentOutletStateRef = parentOutletStateRef;
    this.definition = null;
    this.lastState = null;
    let outletStateTag = this.outletStateTag = UpdatableTag.create(parentOutletStateRef.tag);
    this.tag = combine([outletStateTag, outletNameRef.tag]);
  }

  value(): CurriedComponentDefinition | null {
    let outletName = this.outletNameRef.value();
    let parentState = this.parentOutletStateRef.value();
    if (!parentState) return null;
    let outletState = parentState.outlets[outletName];
    if (!outletState) return null;
    let renderState = outletState.render;
    if (!renderState) return null;
    let template = renderState.template;
    if (!template) return null;
    return curry(new OutletComponentDefinition(outletName, template));
  }
}