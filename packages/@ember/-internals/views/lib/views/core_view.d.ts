import { Renderer } from '@ember/-internals/glimmer';
import { ActionHandler } from '@ember/-internals/runtime';
import EmberObject from '@ember/object';
import Evented from '@ember/object/evented';

interface CoreView extends Evented, ActionHandler {}
declare class CoreView extends EmberObject {
  parentView: CoreView | null;
  renderer: Renderer;
}

export { CoreView as default };
