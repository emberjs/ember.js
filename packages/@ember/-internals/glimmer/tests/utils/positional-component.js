import { componentCapabilities } from '@glimmer/manager';
import { setComponentManager } from '@ember/-internals/glimmer';

class PositionalComponentManager {
  capabilities = componentCapabilities('3.13');

  createComponent(ComponentClass, args) {
    return new ComponentClass(args);
  }

  updateComponent() {}

  getContext(component) {
    return component;
  }
}

/**
  A component that can read its positional arguments.

  `@glimmer/component` drops positional arguments.
  A custom component manager gets them in `args.positional`.

  @private
*/
export class PositionalComponent {
  constructor(args) {
    this.args = args;
  }

  get positional() {
    return this.args.positional;
  }
}

setComponentManager(() => new PositionalComponentManager(), PositionalComponent);
