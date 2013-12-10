/* jshint esnext: true */

import Benchmark from 'benchmark';

export var suite = new Benchmark.Suite('Ember.View - Create');

var View = Ember.View.extend({
  template: Ember.Handlebars.compile("{{view}}")
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
