import { clearElementView, clearViewElement, getViewElement } from '@ember/-internals/views';
import { registerDestructor } from '@glimmer/destroyable';
import type { CapturedNamedArguments } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference';
import { createConstRef } from '@glimmer/reference';
import type { Revision, Tag } from '@glimmer/validator';
import { beginUntrackFrame, endUntrackFrame, valueForTag } from '@glimmer/validator';
import type Component from '../component';

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
  public classRef: Reference | null = null;
  public rootRef: Reference<Component>;
  public argsRevision: Revision;

  constructor(
    public component: Component,
    public args: CapturedNamedArguments | null,
    public argsTag: Tag,
    public finalizer: Finalizer,
    public hasWrappedElement: boolean,
    public isInteractive: boolean
  ) {
    this.classRef = null;
    this.argsRevision = args === null ? 0 : valueForTag(argsTag);
    this.rootRef = createConstRef(component, 'this');

    registerDestructor(this, () => this.willDestroy(), true);
    registerDestructor(this, () => this.component.destroy());
  }

  willDestroy(): void {
    let { component, isInteractive } = this;

    if (isInteractive) {
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
