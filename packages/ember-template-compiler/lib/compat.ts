import compile from './system/compile';
import { registerPlugin } from './system/compile-options';
import precompile from './system/precompile';

export default function setupGlobal(Ember: any) {
  let EmberHandlebars = Ember.Handlebars;
  if (!EmberHandlebars) {
    Ember.Handlebars = EmberHandlebars = {};
  }

  let EmberHTMLBars = Ember.HTMLBars;
  if (!EmberHTMLBars) {
    Ember.HTMLBars = EmberHTMLBars = {};
  }

  EmberHTMLBars.precompile = EmberHandlebars.precompile = precompile;
  EmberHTMLBars.compile = EmberHandlebars.compile = compile;
  EmberHTMLBars.registerPlugin = registerPlugin;
}
