/**
@module ember
@submodule ember-routing
*/

import Service from 'ember-runtime/system/service';
import inject from 'ember-runtime/inject';
import { readOnly } from 'ember-runtime/computed/computed_macros';
import { get } from 'ember-metal/property_get';

export default Service.extend({
  currentRouteName: readOnly('router.currentRouteName'),

  transitionTo() {
    let router = get(this, 'router');

    router.transitionTo(...arguments);
  },

  replaceWith() {
    let router = get(this, 'router');

    router.replaceWith(...arguments);
  },

  isActive(routeName, ...models) {
  },

  isActiveTarget(routeName, ...models) {
  },

  urlFor() {
    let router = get(this, 'router');

    router.generate(...arguments);
  }
});
