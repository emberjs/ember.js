/* jshint esnext: true */

import Benchmark from 'benchmark';

export var suite = new Benchmark.Suite('{{#unbound if}}');

var View = Ember.View.extend({
  condition: true,
  template: Ember.Handlebars.compile('{{#unbound if view.condition}}Shaaazaam!{{/unbound}}')
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
