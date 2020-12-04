import { clearElementView, clearViewElement, getViewElement } from '@ember/-internals/views';
import { registerDestructor } from '@glimmer/destroyable';
import {
  CapturedNamedArguments,
  Environment,
  Template,
  TemplateFactory,
} from '@glimmer/interfaces';
import { createConstRef, Reference } from '@glimmer/reference';
import { beginUntrackFrame, endUntrackFrame, Revision, Tag, valueForTag } from '@glimmer/validator';
import { Renderer } from '../renderer';

export interface Component {
  _debugContainerKey: string;
  _transitionTo(name: string): void;
  layout?: TemplateFactory | Template;
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
  public classRef: Reference | null = null;
  public rootRef: Reference<Component>;
  public argsRevision: Revision;

  constructor(
    public environment: Environment,
    public component: Component,
    public args: CapturedNamedArguments | null,
    public argsTag: Tag,
    public finalizer: Finalizer,
    public hasWrappedElement: boolean
  ) {
    this.classRef = null;
    this.argsRevision = args === null ? 0 : valueForTag(argsTag);
    this.rootRef = createConstRef(component, 'this');

    registerDestructor(this, () => this.willDestroy(), true);
    registerDestructor(this, () => this.component.destroy());
  }

  willDestroy(): void {
    let { component, environment } = this;

    if (environment.isInteractive) {
      beginUntrackFrame();
      component.trigger('willDestroyElement');
      component.trigger('willClearRender');
      endUntrackFrame();

      let element = getViewElement(component);

      if (element) {
        clearElementView(element);
        clearViewElement(component);
      }
    }

    component.renderer.unregister(component);
  }

  finalize(): void {
    let { finalizer } = this;
    finalizer();
    this.finalizer = NOOP;
  }
}
