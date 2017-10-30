import { Opaque } from '@glimmer/interfaces';
import { Revision } from '@glimmer/reference';
import {
  CapturedNamedArguments
} from '@glimmer/runtime';
import Environment from '../environment';

export interface Component {
  _debugContainerKey: string;
  _transitionTo(name: string): void;
  attributeBindings: any;
  classNames: any;
  classNameBindings: any;
  elementId: string;
  tagName: string;
  isDestroying: boolean;
  trigger(event: string): void;
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

  constructor(public environment: Environment, public component: Component, public args: CapturedNamedArguments, public finalizer: Finalizer) {
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
