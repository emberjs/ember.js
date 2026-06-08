/**
  The `{{rootUrl}}` helper returns the application's configured `rootURL`.

  ```javascript
  import { rootUrl } from '@ember/routing';
  ```

  ```handlebars
  <a href="{{rootUrl}}profile">Profile</a>
  ```

  @method root-url
  @for Ember.Templates.helpers
  @public
*/
import type RouterService from '@ember/routing/router-service';
import { service } from '@ember/service';
import Helper from '@ember/component/helper';

export default class RootUrlHelper extends Helper {
  @service('router') declare private router: RouterService;

  compute(): string {
    return this.router.rootURL;
  }
}
