/**
  The `{{url-for}}` helper returns a URL string for a given route, matching the
  same arguments as `<LinkTo>`. Unlike `<LinkTo>`, it returns a string value
  rather than rendering an anchor element.

  ```handlebars
  <a href={{url-for "profile" this.user}}>Profile</a>
  ```

  With query params:

  ```handlebars
  <a href={{url-for "posts" queryParams=(hash page=2)}}>Page 2</a>
  ```

  Returns `undefined` if the route name or any model is null/undefined (loading state).

  @method url-for
  @for Ember.Templates.helpers
  @public
*/
import type { CapturedArguments } from '@glimmer/interfaces';
import type { InternalOwner } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import { createComputeRef, valueForRef } from '@glimmer/reference/lib/reference';
import { consumeTag } from '@glimmer/validator/lib/tracking';
import { tagFor } from '@glimmer/validator/lib/meta';
import type Route from '@ember/routing/route';
import type { RoutingService } from '@ember/routing/-internals';
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
        let routeName =
          routeRef !== undefined ? (valueForRef(routeRef) as string | null | undefined) : undefined;
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        let models = positional.slice(1).map((ref) => valueForRef(ref)) as {}[];
        let queryParamsRef = named['queryParams'];
        let queryParams =
          queryParamsRef !== undefined
            ? (valueForRef(queryParamsRef) as Record<string, unknown>)
            : {};

        // Consume currentState so this ref invalidates when QPs change, matching
        // the same pattern as LinkTo's href getter.
        consumeTag(tagFor(routing, 'currentState'));

        if (isMissing(routeName) || models.some(isMissing)) {
          return undefined;
        }

        return routing.generateURL(routeName, models, queryParams);
      },
      null,
      'url-for'
    );
  }
);
