// require the main entry points for each of these packages
// this is so that the global exports occur properly
import "ember-metal";
import "ember-runtime";
import "ember-views";
import "ember-routing";
import "ember-application";
import "ember-extension-support";
import "ember-htmlbars";
import "ember-routing-htmlbars";
import "ember-routing-views";

import environment from "ember-metal/environment";
import { runLoadHooks } from 'ember-runtime/system/lazy_load';

if (Ember.__loader.registry['ember-template-compiler']) {
  requireModule('ember-template-compiler');
}

// do this to ensure that Ember.Test is defined properly on the global
// if it is present.
if (Ember.__loader.registry['ember-testing']) {
  requireModule('ember-testing');
}

runLoadHooks('Ember');

/**
Ember

@module ember
*/

Ember.deprecate('Usage of Ember is deprecated for Internet Explorer 6 and 7, support will be removed in the next major version.', !environment.userAgent.match(/MSIE [67]/));
