/* jshint esnext:true */

import Benchmark from 'benchmark';

export var suite = new Benchmark.Suite('Computed Properties - Create');

var obj = null;

suite.add('Creates object without CP', function(){
  obj = Ember.Object.create({
    name: 'Alex',
    state: 'happy'
  });
});

suite.add('Creates object with CP', function(){
  obj = Ember.Object.createWithMixins({
    name: 'Alex',
    state: 'happy',
    napTime: function() {}.property('state')
  });
});
