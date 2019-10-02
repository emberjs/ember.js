import { clearElementView, clearViewElement, getViewElement } from '@ember/-internals/views';
import { Revision, value, VersionedReference } from '@glimmer/reference';
import { CapturedNamedArguments } from '@glimmer/runtime';
import Environment from '../environment';
import { Factory as TemplateFactory, OwnedTemplate } from '../template';

export interface Component {
  _debugContainerKey: string;
  _transitionTo(name: string): void;
  layout?: TemplateFactory | OwnedTemplate;
  layoutName?: string;
  attributeBindings: Array<string>;
  classNames: Array<string>;
  classNameBindings: Array<string>;
  elementId: string;
  tagName: string;
  isDestroying: boolean;
  appendChild(view: {}): void;
  trigger(event: string): void;
  destroy(): void;
  setProperties(props: { [key: string]: any }): void;
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
  public classRef: VersionedReference<unknown> | null = null;
  public argsRevision: Revision;

  constructor(
    public environment: Environment,
    public component: Component,
    public args: CapturedNamedArguments | null,
    public finalizer: Finalizer,
    public hasWrappedElement: boolean
  ) {
    this.classRef = null;
    this.argsRevision = args === null ? 0 : value(args.tag);
  }

  destroy() {
    let { component, environment } = this;

    if (environment.isInteractive) {
      component.trigger('willDestroyElement');
      component.trigger('willClearRender');

      let element = getViewElement(component);

      if (element) {
        clearElementView(element);
        clearViewElement(component);
      }
    }

    environment.destroyedComponents.push(component);
  }

  finalize() {
    let { finalizer } = this;
    finalizer();
    this.finalizer = NOOP;
  }
}
