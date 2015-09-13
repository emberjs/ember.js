import Ember from 'ember-metal/core';

/**
@module ember
@submodule ember-application
*/

Ember.onLoad('Ember.Application', function() {
  Ember.__loader.require('ember-application/ext/controller');
});

var reexport = Ember.__reexport;

reexport('ember-application/system/application', 'Application');
reexport('ember-application/system/resolver', ['Resolver']);
reexport('ember-application/system/resolver', 'DefaultResolver');
