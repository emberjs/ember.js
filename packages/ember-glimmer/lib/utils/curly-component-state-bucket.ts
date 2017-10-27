import { Opaque } from '@glimmer/interfaces';
import { Revision, Tagged } from '@glimmer/reference';

interface Environment {
  isInteractive: boolean;
  destroyedComponents: Component[];
}

interface Component {
  _debugContainerKey: string;
  trigger(event: string);
  destroy(): void;
  setProperties(props: {
    [key: string]: any;
  }): void;
}

type Finalizer = () => void;
function NOOP() {}

/**
  @module ember
*/

/**
  Represents the internal state of the component.

  @class ComponentStateBucket
  @private
*/
export default class ComponentStateBucket {
  public classRef: Opaque = null;
  public argsRevision: Revision;

  constructor(public environment: Environment, public component: Component, public args: Tagged, public finalizer: Finalizer) {
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
