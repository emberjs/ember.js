import { componentCapabilities } from '@glimmer/manager';
import { setComponentManager } from '@ember/-internals/glimmer';
import { setOwner } from '@ember/-internals/owner';

class GlimmerishComponentManager {
  constructor(owner) {
    this.capabilities = componentCapabilities('3.13', { updateHook: false });
    this.owner = owner;
  }

  createComponent(Factory, args) {
    return new Factory(this.owner, args.named);
  }

  getContext(component) {
    return component;
  }
}

class GlimmerishComponent {
  constructor(owner, args) {
    setOwner(this, owner);
    this.args = args;
  }
}

setComponentManager(() => new GlimmerishComponentManager(), GlimmerishComponent);

export default GlimmerishComponent;
