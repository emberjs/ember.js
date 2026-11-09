import type Controller from '@ember/controller';
import { getOwner } from '@ember/-internals/owner';
import type { InternalOwner } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import type Route from '@ember/routing/route';
import type { scheduleOnce } from '@ember/runloop';

export class ClassicRouteBucket {
  // The route's controller, read through as a getter so there is a single
  // source of truth. An eagerly-copied field would go stale for substate
  // routes: they enter via intermediate transitions that skip `willEnter`,
  // so the copy would stay `undefined` while `route.controller` is set
  // later by `setup` — and their templates would render with no `{{this}}`.
  get controller(): Controller | undefined {
    return this.route.controller;
  }

  get owner(): InternalOwner {
    let owner = getOwner(this.route);
    assert('Route is unexpectedly missing an owner', owner);
    return owner;
  }

  // Runloop timer for the pending loading-event dispatch scheduled during
  // willEnter. Per-bucket so concurrent routes track their own timers and
  // didEnter can cancel the right one.
  loadingSubstateTimer: ReturnType<typeof scheduleOnce> | null = null;

  constructor(public route: Route) {}
}
