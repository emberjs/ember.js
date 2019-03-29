import { setComponentManager, capabilities } from '@ember/-internals/glimmer';
import { get, set } from '@ember/-internals/metal';
import { setOwner } from '@ember/-internals/owner';

class GlimmerishComponentManager {
  constructor(owner) {
    this.capabilities = capabilities('3.4');
    this.owner = owner;
  }

  createComponent(Factory, args) {
    return new Factory(this.owner, args.named);
  }

  updateComponent(component, args) {
    set(component, 'args', args.named);
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

  get args() {
    return get(this, '__args__');
  }

  set args(args) {
    set(this, '__args__', args);
  }
}

setComponentManager(() => new GlimmerishComponentManager(), GlimmerishComponent);

export default GlimmerishComponent;
