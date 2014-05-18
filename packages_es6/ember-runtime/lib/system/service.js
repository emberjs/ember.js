import Object from "ember-runtime/system/object";

var Service;

if (Ember.FEATURES.isEnabled('services')) {
  Service = Object.extend();
}

export default Service;
