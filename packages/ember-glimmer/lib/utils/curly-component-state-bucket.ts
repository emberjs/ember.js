import { Revision, VersionedReference } from '@glimmer/reference';
import { CapturedNamedArguments } from '@glimmer/runtime';
import { Opaque } from '@glimmer/util/dist/types';
import Environment from '../environment';
import { ComponentCapabilities } from '../component-managers/capabilities';

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
// tslint:disable-next-line:no-empty
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
  public classRef: VersionedReference<Opaque> | null = null;
  public argsRevision: Revision;
  public capabilities: ComponentCapabilities;

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
