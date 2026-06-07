/**
  The `{{root-url}}` helper returns the application's configured `rootURL`.

  ```handlebars
  <a href="{{root-url}}profile">Profile</a>
  ```

  @method root-url
  @for Ember.Templates.helpers
  @public
*/
import type { CapturedArguments } from '@glimmer/interfaces';
import type { InternalOwner } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import { createConstRef } from '@glimmer/reference/lib/reference';
import type RouterService from '@ember/routing/router-service';
import { internalHelper } from './internal-helper';

export default internalHelper(
  (_args: CapturedArguments, owner: InternalOwner | undefined) => {
    assert('[BUG] missing owner', owner);
    const router = owner.lookup('service:router') as RouterService;
    // rootURL is a static configuration value — safe to use a const ref.
    return createConstRef(router.rootURL, 'root-url');
  }
);
