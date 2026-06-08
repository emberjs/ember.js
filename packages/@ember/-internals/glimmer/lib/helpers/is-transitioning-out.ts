/**
  The `{{isTransitioningOut}}` helper returns `true` when the application is
  currently transitioning *away from* the specified route — i.e., the route is
  active now but will no longer be active when the in-flight transition settles.

  This corresponds to the `ember-transitioning-out` CSS class that `<LinkTo>`
  applies during such transitions.

  ```javascript
  import { isTransitioningOut } from '@ember/routing';
  ```

  ```handlebars
  <a class={{if (isTransitioningOut "about") "leaving"}}>About</a>
  ```

  Returns `false` when no transition is in flight or the route is not currently active.

  @method is-transitioning-out
  @for Ember.Templates.helpers
  @public
*/
import type { Maybe } from '@glimmer/interfaces';
import type Route from '@ember/routing/route';
import type { RouterState, RoutingService } from '@ember/routing/-internals';
import { service } from '@ember/service';
import Helper from '@ember/component/helper';
import { isMissing } from './-router-helpers-utils';

export default class IsTransitioningOutHelper extends Helper {
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

    return isCurrentlyActive && !willBeActive;
  }
}
