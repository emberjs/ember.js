import Ember from 'ember-metal/core'; // reexports
import compiler from './compiler';

let EmberHandlebars = Ember.Handlebars = Ember.Handlebars || {};
let EmberHTMLBars = Ember.HTMLBars = Ember.HTMLBars || {};

let { precompile, compile, template, registerPlugin } = compiler();

EmberHTMLBars.precompile = EmberHandlebars.precompile = precompile;
EmberHTMLBars.compile = EmberHandlebars.compile = compile;
EmberHTMLBars.template = EmberHandlebars.template = template;
EmberHTMLBars.registerPlugin = registerPlugin;
