import { Dict, Owner, ComponentManager, Arguments } from '@glimmer/interfaces';
import { destroy, isDestroyed, isDestroying, registerDestructor, setOwner } from '@glimmer/runtime';
import { componentCapabilities, setComponentManager } from '@glimmer/manager';

export type Args = Dict;

export class GlimmerishComponent {
  public args: Dict;

  constructor(owner: Owner, args: Dict) {
    setOwner(this, owner);
    this.args = args;
  }

  get isDestroying() {
    return isDestroying(this);
  }

  get isDestroyed() {
    return isDestroyed(this);
  }

  willDestroy() {}
}

export interface Constructor<T> {
  new (owner: unknown, args: {}): T;
}

const CAPABILITIES = componentCapabilities('3.13', {
  destructor: true,
});

class GlimmerComponentManager implements ComponentManager<GlimmerishComponent> {
  capabilities = CAPABILITIES;

  private owner: unknown;

  constructor(owner: unknown) {
    this.owner = owner;
  }

  createComponent(
    ComponentClass: Constructor<GlimmerishComponent>,
    args: Arguments
  ): GlimmerishComponent {
    let component = new ComponentClass(this.owner, args.named);

    registerDestructor(component, () => component.willDestroy());

    return component;
  }

  getContext(component: GlimmerishComponent): GlimmerishComponent {
    return component;
  }

  destroyComponent(component: GlimmerishComponent): void {
    destroy(component);
  }
}

setComponentManager((owner) => new GlimmerComponentManager(owner), GlimmerishComponent);
