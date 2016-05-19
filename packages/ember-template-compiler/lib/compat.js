import Ember from 'ember-metal/core'; // reexports
import compiler from './compiler';

var EmberHandlebars = Ember.Handlebars = Ember.Handlebars || {};

let { precompile, compile, template } = compiler();

EmberHandlebars.precompile = precompile;
EmberHandlebars.compile = compile;
EmberHandlebars.template = template;
