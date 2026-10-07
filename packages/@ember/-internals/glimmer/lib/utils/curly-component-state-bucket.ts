import {
  clearElementView,
  clearViewElement,
  getViewElement,
} from '@ember/-internals/views/lib/system/utils';
import { sendCoreViewEvent } from '@ember/-internals/views/lib/views/core-view-utils';
import { registerDestructor } from '@glimmer/destroyable';
import type { CapturedNamedArguments } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference/lib/reference';
import { createConstRef } from '@glimmer/reference/lib/reference';
import { beginUntrackFrame, endUntrackFrame } from '@glimmer/signals/lib/tags';
import type { TagNode } from '@glimmer/signals/lib/tags';
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

  constructor(
    public component: Component,
    public args: CapturedNamedArguments | null,
    public argsFrame: TagNode,
    public finalizer: Finalizer,
    public hasWrappedElement: boolean,
    public isInteractive: boolean
  ) {
    this.classRef = null;
    this.rootRef = createConstRef(component, 'this');

    registerDestructor(this, () => this.willDestroy(), true);
    registerDestructor(this, () => this.component.destroy());
  }

  willDestroy(): void {
    let { component, isInteractive } = this;

    if (isInteractive) {
      beginUntrackFrame();
      sendCoreViewEvent(component, 'willDestroyElement');
      sendCoreViewEvent(component, 'willClearRender');
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
