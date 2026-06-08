/**
  The `{{isTransitioningIn}}` helper returns `true` when the application is
  currently transitioning *into* the specified route — i.e., the route is not
  yet active but will become active when the in-flight transition settles.

  This corresponds to the `ember-transitioning-in` CSS class that `<LinkTo>`
  applies during such transitions.

  ```javascript
  import { isTransitioningIn } from '@ember/routing';
  ```

  ```handlebars
  <a class={{if (isTransitioningIn "about") "entering"}}>About</a>
  ```

  Returns `false` when no transition is in flight or the route is already active.

  @method is-transitioning-in
  @for Ember.Templates.helpers
  @public
*/
import type { Maybe } from '@glimmer/interfaces';
import type Route from '@ember/routing/route';
import type { RouterState, RoutingService } from '@ember/routing/-internals';
import { service } from '@ember/service';
import Helper from '@ember/component/helper';
import { isMissing } from './-router-helpers-utils';

export default class IsTransitioningInHelper extends Helper {
  @service('-routing') declare private routing: RoutingService<Route>;

  compute(
    [routeName, ...models]: [string | null | undefined, ...unknown[]],
    { queryParams }: { queryParams?: Record<string, unknown> }
  ): boolean {
    if (isMissing(routeName) || models.some(isMissing)) {
      return false;
    }

    const current = this.routing.currentState as Maybe<RouterState>;
    const target = this.routing.targetState as Maybe<RouterState>;

    // No transition in flight.
    if (isMissing(target) || current === target) {
      return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    const castedModels = models as {}[];
    const isCurrentlyActive =
      !isMissing(current) &&
      this.routing.isActiveForRoute(castedModels, queryParams, routeName, current);
    const willBeActive = this.routing.isActiveForRoute(castedModels, queryParams, routeName, target);

    return !isCurrentlyActive && willBeActive;
  }
}
