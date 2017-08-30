import { Opaque } from '@glimmer/interfaces';
import { Revision, Tagged } from '@glimmer/reference';

interface Environment {
  isInteractive: boolean;
  destroyedComponents: Component[];
}

interface Component {
  trigger(event: string);
}

type Finalizer = () => void;
function NOOP() {}

/**
  @module ember
  @submodule ember-glimmer
*/

/**
  Represents the internal state of the component.

  @class ComponentStateBucket
  @private
*/
export default class ComponentStateBucket {
  private classRef: Opaque = null;
  private argsRevision: Revision;

  constructor(private environment: Environment, private component: Component, private args: Tagged, private finalizer: Finalizer) {
    this.classRef = null;
    this.argsRevision = args.tag.value();
  }

  destroy() {
    let { component, environment } = this;

    if (environment.isInteractive) {
      component.trigger('willDestroyElement');
      component.trigger('willClearRender');
    }

    environment.destroyedComponents.push(component);
  }

  finalize() {
    let { finalizer } = this;
    finalizer();
    this.finalizer = NOOP;
  }
}
