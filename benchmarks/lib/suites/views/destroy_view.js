/* jshint esnext: true */

import Benchmark from 'benchmark';

export var suite = new Benchmark.Suite('Ember.View - Destroy');

var view = Ember.ContainerView.create({
             childViews: ['one', 'two', 'three'],
             one:   Ember.View,
             two:   Ember.View,
             three: Ember.View
           });

suite.on('setup', function() {
  view.append();
});

suite.add('Destroys the view', function() {
  Ember.run(function() {
    view.destroy();
  });
});
