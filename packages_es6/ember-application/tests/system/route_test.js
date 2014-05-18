import "ember-application/ext/route";

import Route from "ember-routing/system/route";
import Service from "ember-runtime/system/service";

import Container from "ember-runtime/system/container";

import { computed } from "ember-metal/computed";

if (Ember.FEATURES.isEnabled('services')) {
  test("routes have access to services", function() {
    expect(2);

    var container = new Container();

    container.register('route:post', Route.extend());
    container.register('service:geolocation', Service.extend());

    var postRoute = container.lookup('route:post'),
        geolocationService = container.lookup('service:geolocation');

    equal(geolocationService, postRoute.get('services.geolocation'), "registered service is available");

    raises(function() {
      postRoute.get('services.nonexistent');
    }, ReferenceError, "accessing a non-existent service raises an error");
  });

  test("can unit test routes with services dependencies by stubbing their `services` property", function() {
    expect(1);

    var BrotherRoute = Route.extend({
      foo: computed.alias('services.sister.foo')
    });

    var broRoute = BrotherRoute.create({
      services: {
        sister: { foo: 5 }
      }
    });

    equal(broRoute.get('foo'), 5, "services can be stubbed");
  });
}
