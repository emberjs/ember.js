import { DEBUG } from '@glimmer/env';
import { setComponentManager } from '@ember/component';
import GlimmerComponentManager from './-private/ember-component-manager';
import _GlimmerComponent, { type Args } from './-private/component';
import { setOwner, type default as Owner } from '@ember/owner';

export default class GlimmerComponent<S = unknown> extends _GlimmerComponent<S> {
  constructor(owner: Owner, args: Args<S>) {
    super(owner, args);

    if (DEBUG && !(owner !== null && typeof owner === 'object')) {
      throw new Error(
        `You must pass both the owner and args to super() in your component: ${this.constructor.name}. You can pass them directly, or use ...arguments to pass all arguments through.`
      );
    }

    setOwner(this, owner);
  }
}

setComponentManager((owner: Owner) => {
  return new GlimmerComponentManager(owner);
}, GlimmerComponent);
