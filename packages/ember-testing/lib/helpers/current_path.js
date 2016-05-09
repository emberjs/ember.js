import { get } from 'ember-metal/property_get';

export default function currentPath(app) {
  let routingService = app.__container__.lookup('service:-routing');
  return get(routingService, 'currentPath');
}
