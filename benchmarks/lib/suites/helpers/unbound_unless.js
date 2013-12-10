/* jshint esnext: true */

import Benchmark from 'benchmark';

export var suite = new Benchmark.Suite('{{#unbound unless}}');

var View = Ember.View.extend({
  condition: true,
  template: Ember.Handlebars.compile('{{#unbound unless view.condition}}I see you{{/unbound}}')
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
