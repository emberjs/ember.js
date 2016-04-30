import { get } from 'ember-metal/property_get';

export default function currentURL(app) {
  let router = app.__container__.lookup('router:main');
  return get(router, 'location').getURL();
}
