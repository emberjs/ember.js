require("ember-runtime");
require("ember-handlebars-compiler");
require("ember-views");
require("ember-handlebars/ext");
require("ember-handlebars/string");
require("ember-handlebars/helpers");
require("ember-handlebars/views");
require("ember-handlebars/controls");
require("ember-handlebars/loader");

/**
Ember Handlebars

@module ember
@submodule ember-handlebars
@requires ember-views
*/

Ember.runLoadHooks('Ember.Handlebars', Ember.Handlebars);
