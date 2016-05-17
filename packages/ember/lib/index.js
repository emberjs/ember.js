// require the main entry points for each of these packages
// this is so that the global exports occur properly
import 'ember-metal';
import 'ember-runtime';
import 'ember-views';
import 'ember-routing';
import 'ember-application';
import 'ember-extension-support';
import 'ember-htmlbars';
import 'ember-routing-htmlbars';
import 'ember-templates';

import require, { has } from 'require';
import { runLoadHooks } from 'ember-runtime/system/lazy_load';

if (has('ember-template-compiler')) {
  require('ember-template-compiler');
}

// do this to ensure that Ember.Test is defined properly on the global
// if it is present.
if (has('ember-testing')) {
  require('ember-testing');
}

runLoadHooks('Ember');

/**
@module ember
*/
