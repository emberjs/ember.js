import type Route from '@ember/routing/route';
import type { RoutingService } from '@ember/routing/-internals';
import { service } from '@ember/service';
import Helper from '../helper';

/**
  The `rootUrl` helper returns the `rootURL` of the application.

  ```gjs
  import { rootUrl } from '@ember/routing';

  <template>
    <p>The application starts at {{rootUrl}}</p>
  </template>
  ```

  In an attribute, call the helper with parentheses.
  Without the parentheses, Glimmer does not call a helper that has no arguments.

  ```gjs
  import { rootUrl } from '@ember/routing';

  <template>
    <a href="{{(rootUrl)}}profile">Profile</a>
  </template>
  ```

  @method rootUrl
  @for @ember/routing
  @static
  @return {String} the `rootURL` of the application
  @public
*/
export default class RootUrlHelper extends Helper<{ Args: { Positional: [] }; Return: string }> {
  @service('-routing') declare private routing: RoutingService<Route>;

  compute(): string {
    return this.routing.router.rootURL;
  }
}
