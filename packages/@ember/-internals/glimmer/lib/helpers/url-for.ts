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
import type RouterService from '@ember/routing/router-service';
import { service } from '@ember/service';
import Helper from '@ember/component/helper';
import { isMissing } from './-router-helpers-utils';

export default class UrlForHelper extends Helper {
  @service('router') declare private router: RouterService;

  compute(
    [routeName, ...models]: [string | null | undefined, ...unknown[]],
    { queryParams }: { queryParams?: Record<string, unknown> }
  ): string | undefined {
    if (isMissing(routeName) || models.some(isMissing)) {
      return undefined;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const args: any[] = queryParams ? [...models, { queryParams }] : [...models];
    return this.router.urlFor(routeName, ...args);
  }
}
