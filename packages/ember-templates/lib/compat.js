import Ember from 'ember-metal/core'; // reexports
import template from './template';

let EmberHandlebars = Ember.Handlebars = Ember.Handlebars || {};
let EmberHTMLBars = Ember.HTMLBars = Ember.HTMLBars || {};

EmberHTMLBars.template = EmberHandlebars.template = template;
