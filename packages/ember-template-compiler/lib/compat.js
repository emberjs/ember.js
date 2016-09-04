import Ember from 'ember-metal'; // reexports
import precompile from './system/precompile';
import compile from './system/compile';
import { registerPlugin } from './system/compile-options';

let EmberHandlebars = Ember.Handlebars = Ember.Handlebars || {};
let EmberHTMLBars = Ember.HTMLBars = Ember.HTMLBars || {};

EmberHTMLBars.precompile = EmberHandlebars.precompile = precompile;
EmberHTMLBars.compile = EmberHandlebars.compile = compile;
EmberHTMLBars.registerPlugin = registerPlugin;
