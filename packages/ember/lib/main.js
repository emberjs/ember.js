/* global navigator */
// require the main entry points for each of these packages
// this is so that the global exports occur properly
import "ember-metal";
import "ember-runtime";
import "ember-handlebars";
import "ember-views";
import "ember-routing";
import "ember-routing-handlebars";
import "ember-application";
import "ember-extension-support";

// do this to ensure that Ember.Test is defined properly on the global
// if it is present.
if (Ember.__loader.registry['ember-testing']) {
  requireModule('ember-testing');
}

/**
Ember

@module ember
*/
if (typeof navigator !== 'undefined') {
	Ember.deprecate('Usage of Ember is deprecated for Internet Explorer 6 and 7, support will be removed in the next major version.', !navigator.userAgent.match(/MSIE [67]/));
}
