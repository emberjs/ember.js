require('ember-runtime/system/object');
require('ember-runtime/system/string');

Ember.ControllerMixin = Ember.Mixin.create();

Ember.Controller = Ember.Object.extend(Ember.ControllerMixin);
