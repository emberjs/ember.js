/**
  The `{{is-transitioning-out}}` helper returns `true` when the application is
  currently transitioning *away from* the specified route — i.e., the route is
  active now but will no longer be active when the in-flight transition settles.

  This corresponds to the `ember-transitioning-out` CSS class that `<LinkTo>`
  applies during such transitions.

  ```handlebars
  <a class={{if (is-transitioning-out "about") "leaving"}}>About</a>
  ```

  Returns `false` when no transition is in flight or the route is not currently active.

  @method is-transitioning-out
  @for Ember.Templates.helpers
  @public
*/
import type { CapturedArguments, Maybe } from '@glimmer/interfaces';
import type { InternalOwner } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import { createComputeRef, valueForRef } from '@glimmer/reference/lib/reference';
import { consumeTag } from '@glimmer/validator/lib/tracking';
import { tagFor } from '@glimmer/validator/lib/meta';
import type Route from '@ember/routing/route';
import type { RouterState, RoutingService } from '@ember/routing/-internals';
import { internalHelper } from './internal-helper';

function isMissing(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

export default internalHelper(
  ({ positional, named }: CapturedArguments, owner: InternalOwner | undefined) => {
    assert('[BUG] missing owner', owner);
    const routing = owner.lookup('service:-routing') as RoutingService<Route>;

    return createComputeRef(
      () => {
        let routeRef = positional[0];
        let routeName = routeRef !== undefined ? (valueForRef(routeRef) as string | null | undefined) : undefined;
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        let models = positional.slice(1).map((ref) => valueForRef(ref)) as {}[];
        let queryParamsRef = named['queryParams'];
        let queryParams =
          queryParamsRef !== undefined
            ? (valueForRef(queryParamsRef) as Record<string, unknown>)
            : undefined;

        consumeTag(tagFor(routing, 'currentState'));
        consumeTag(tagFor(routing, 'targetState'));

        if (isMissing(routeName) || models.some(isMissing)) {
          return false;
        }

        let current = routing.currentState as Maybe<RouterState>;
        let target = routing.targetState as Maybe<RouterState>;

        // No transition in flight.
        if (isMissing(target) || current === target) {
          return false;
        }

        let isCurrentlyActive =
          !isMissing(current) &&
          routing.isActiveForRoute(models, queryParams, routeName, current);
        let willBeActive = routing.isActiveForRoute(models, queryParams, routeName, target);

        return isCurrentlyActive && !willBeActive;
      },
      null,
      'is-transitioning-out'
    );
  }
);
