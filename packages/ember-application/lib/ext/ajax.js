/*globals ic*/

if (Ember.FEATURES.isEnabled("ember-application-ajax")) {
  require('ic-ajax');

  Ember.ajax = ic.ajax;
}
