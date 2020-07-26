import {
  clearElementView,
  clearViewElement,
  getViewElement,
  removeChildView,
} from '@ember/-internals/views';
import { CapturedNamedArguments } from '@glimmer/interfaces';
import { ComponentRootReference, VersionedReference } from '@glimmer/reference';
import { Revision, valueForTag } from '@glimmer/validator';
import { EmberVMEnvironment } from '../environment';
import { Renderer } from '../renderer';
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
  renderer: Renderer;
  parentView: Component;
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
  public rootRef: ComponentRootReference<Component>;
  public argsRevision: Revision;

  constructor(
    public environment: EmberVMEnvironment,
    public component: Component,
    public args: CapturedNamedArguments | null,
    public finalizer: Finalizer,
    public hasWrappedElement: boolean
  ) {
    this.classRef = null;
    this.argsRevision = args === null ? 0 : valueForTag(args.tag);
    this.rootRef = new ComponentRootReference(component, environment);
  }

  willDestroy() {
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

    removeChildView(component.parentView, component);
    component.renderer.unregister(component);
  }

  destroy() {
    this.component.destroy();
  }

  finalize() {
    let { finalizer } = this;
    finalizer();
    this.finalizer = NOOP;
  }
}
