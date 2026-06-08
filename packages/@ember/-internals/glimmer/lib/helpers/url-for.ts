/**
  The `{{urlFor}}` helper returns a URL string for a given route, matching the
  same arguments as `<LinkTo>`. Unlike `<LinkTo>`, it returns a string value
  rather than rendering an anchor element.

  ```javascript
  import { urlFor } from '@ember/routing';
  ```

  ```handlebars
  <a href={{urlFor "profile" this.user}}>Profile</a>
  ```

  With query params:

  ```handlebars
  <a href={{urlFor "posts" queryParams=(hash page=2)}}>Page 2</a>
  ```

  Returns `undefined` if the route name or any model is null/undefined (loading state).

  @method url-for
  @for Ember.Templates.helpers
  @public
*/
import type Route from '@ember/routing/route';
import type { RoutingService } from '@ember/routing/-internals';
import { service } from '@ember/service';
import Helper from '@ember/component/helper';
import { isMissing } from './-router-helpers-utils';

export default class UrlForHelper extends Helper {
  @service('-routing') declare private routing: RoutingService<Route>;

  compute(
    [routeName, ...models]: [string | null | undefined, ...unknown[]],
    { queryParams }: { queryParams?: Record<string, unknown> }
  ): string | undefined {
    if (isMissing(routeName) || models.some(isMissing)) {
      return undefined;
    }

    // Access currentState to track route state changes (e.g. QP updates),
    // mirroring LinkTo's href behavior.
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this.routing.currentState;

    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    return this.routing.generateURL(routeName, models as {}[], queryParams ?? {});
  }
}
