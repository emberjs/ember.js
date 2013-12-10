/* jshint esnext: true */

import Benchmark from 'benchmark';

export var suite = new Benchmark.Suite('{{#if}}');

var View = Ember.View.extend({
  condition: true,
  template: Ember.Handlebars.compile('{{#if view.condition}}Baaaazzinga!{{/if}}')
}), view;

suite.on('setup', function() {
  view.append();
});

suite.add('Creates the view', function() {
  Ember.run(function() {
    view = View.create().append();
  });
});

suite.on('teardown', function() {
  view.destroy();
});
