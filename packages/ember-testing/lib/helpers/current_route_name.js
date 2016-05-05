import { get } from 'ember-metal/property_get';

export default function currentRouteName(app) {
  let routingService = app.__container__.lookup('service:-routing');
  return get(routingService, 'currentRouteName');
}
