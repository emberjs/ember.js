import type RouterService from '@ember/routing/router-service';
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

  The helper uses the `router` service.
  In an engine, the engine must supply that service.

  @method rootUrl
  @for @ember/routing
  @static
  @return {String} the `rootURL` of the application
  @public
*/
export default class RootUrlHelper extends Helper<{ Args: { Positional: [] }; Return: string }> {
  @service('router') declare private router: RouterService;

  compute(): string {
    return this.router.rootURL;
  }
}
