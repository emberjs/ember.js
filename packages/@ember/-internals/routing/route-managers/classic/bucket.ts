import type Controller from '@ember/controller';
import type Route from '@ember/routing/route';

export class ClassicRouteBucket {
  // Cached invokable, written by buildClassicInvokable on first build.
  invokable: object | undefined = undefined;

  // Cached wrapper definition returned from getRouteWrapper. Stable across
  // re-renders for outlet identity stability.
  wrapper: object | undefined = undefined;

  // The route's controller, read through as a getter so there is a single
  // source of truth. An eagerly-copied field would go stale for substate
  // routes: they enter via intermediate transitions that skip `willEnter`,
  // so the copy would stay `undefined` while `route.controller` is set
  // later by `setup` — and their templates would render with no `{{this}}`.
  get controller(): Controller | undefined {
    return this.route.controller;
  }

  // Runloop timer for the pending loading-substate transition scheduled
  // during willEnter. Per-bucket so concurrent routes track their own
  // timers and didEnter can cancel the right one.
  loadingSubstateTimer: unknown = null;

  constructor(public route: Route) {}
}
