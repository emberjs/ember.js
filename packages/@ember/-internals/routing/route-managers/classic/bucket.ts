import type Controller from '@ember/controller';
import type { InternalOwner } from '@ember/-internals/owner';
import type Route from '@ember/routing/route';
import type { scheduleOnce } from '@ember/runloop';
import { consumeTag } from '@glimmer/validator/lib/tracking';
import { createTag, DIRTY_TAG as dirtyTag } from '@glimmer/validator/lib/validators';

export class ClassicRenderState {
  #tag = createTag();

  declare owner: InternalOwner;
  name = '';
  invokable: object | undefined = undefined;

  constructor(readonly bucket: ClassicRouteBucket) {}

  consume(): this {
    consumeTag(this.#tag);
    return this;
  }

  update(owner: InternalOwner, name: string, invokable: object | undefined): this {
    this.owner = owner;
    this.name = name;
    this.invokable = invokable;
    dirtyTag(this.#tag);
    return this;
  }
}

export class ClassicRouteBucket {
  // Cached invokable, written by buildClassicInvokable on first build.
  invokable: object | undefined = undefined;

  // The route's controller, read through as a getter so there is a single
  // source of truth. An eagerly-copied field would go stale for substate
  // routes: they enter via intermediate transitions that skip `willEnter`,
  // so the copy would stay `undefined` while `route.controller` is set
  // later by `setup` — and their templates would render with no `{{this}}`.
  get controller(): Controller | undefined {
    return this.route.controller;
  }

  // Getter for the same staleness reason.
  get context(): unknown {
    return this.route.currentModel;
  }

  // Runloop timer for the pending loading-event dispatch scheduled during
  // willEnter. Per-bucket so concurrent routes track their own timers and
  // didEnter can cancel the right one.
  loadingSubstateTimer: ReturnType<typeof scheduleOnce> | null = null;

  readonly render = new ClassicRenderState(this);

  constructor(public route: Route) {}
}
