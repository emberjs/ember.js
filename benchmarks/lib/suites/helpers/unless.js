/* jshint esnext: true */

import Benchmark from 'benchmark';

export var suite = new Benchmark.Suite('{{#unless}}');

var View = Ember.View.extend({
  condition: true,
  template: Ember.Handlebars.compile('{{#unless view.condition}}STUFF{{/unless}}')
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
