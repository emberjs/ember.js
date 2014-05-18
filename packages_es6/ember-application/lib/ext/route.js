/**
@module ember
@submodule ember-application
*/

import Ember from "ember-metal/core"; // Ember.assert
import Route from "ember-routing/system/route";

import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import { inspect } from "ember-metal/utils";
import { computed } from "ember-metal/computed";

if (Ember.FEATURES.isEnabled('services')) {
  var defaultServicesComputedProperty = computed(function() {
    var route = this;

    return {
      container: get(route, 'container'),
      unknownProperty: function(serviceName) {
        var service = this.container.lookup('service:' + serviceName);

        if (!service) {
          var errorMessage = "The " + serviceName + " service was accessed from the " + inspect(route) + " route, but no service with that name was found.";
          throw new ReferenceError(errorMessage);
        }

        return service;
      },
      setUnknownProperty: function (key, value) {
        throw new Error("You cannot overwrite the value of `services." + key + "` of " + inspect(route));
      }
    };
  });

  Route.reopen({
    /**
     Stores instances of services available for this route to use.
     Routes have access to all services defined in the application.
     Services provide model information to routes and controllers.

     ```javascript
     App.NearbyTweetsRoute = Ember.Route.extend({
       model: function() {
         var geolocation = this.get('services.geolocation'),
             twitter = this.get('services.twitter');

         return geolocation.currentLocation().then(function(lat, lng) {
           return twitter.findNearbyTweets(lat, lng);
         };
       }
     });
     ```

     @property {Object} services
   */
    services: defaultServicesComputedProperty
  });
}
