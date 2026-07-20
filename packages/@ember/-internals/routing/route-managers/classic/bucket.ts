import type Controller from '@ember/controller';
import type Route from '@ember/routing/route';
import type { scheduleOnce } from '@ember/runloop';

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

  // Runloop timer for the pending loading-event dispatch scheduled during
  // willEnter. Per-bucket so concurrent routes track their own timers and
  // didEnter can cancel the right one.
  loadingSubstateTimer: ReturnType<typeof scheduleOnce> | null = null;

  constructor(public route: Route) {}
}
