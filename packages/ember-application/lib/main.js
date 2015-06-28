import Ember from 'ember-metal/core';

/**
@module ember
@submodule ember-application
*/

<<<<<<< HEAD
import DefaultResolver from 'ember-application/system/resolver';
import {
  Resolver
} from 'ember-application/system/resolver';
import Application from 'ember-application/system/application';
=======
Ember.onLoad('Ember.Application', function() {
  Ember.__loader.require('ember-application/ext/controller');
});
>>>>>>> play with making more things lazy. HTMLBars stuff still is quite costly…

var reexport = Ember.__reexport;

reexport('ember-application/system/application', 'Application');
reexport('ember-application/system/resolver', ['Resolver']);
reexport('ember-application/system/resolver', 'DefaultResolver');
