import Ember from 'ember-metal/core';
import precompile from 'ember-template-compiler/compat/precompile';
import compile from 'ember-template-compiler/system/compile';
import template from 'ember-template-compiler/system/template';

var EmberHandlebars = Ember.Handlebars = Ember.Handlebars || {};

EmberHandlebars.precompile = precompile;
EmberHandlebars.compile = compile;
EmberHandlebars.template = template;
