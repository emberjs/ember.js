/* jshint esnext:true */

import Benchmark from 'benchmark';

export var suite = new Benchmark.Suite('Observers - Create');

var obj = null;

suite.add('Creates object without observer', function(){
  obj = Ember.Object.create({
    name: 'Alex',
    state: 'happy'
  });
});

suite.add('Creates object with observer', function(){
  obj = Ember.Object.create({
    name: 'Alex',
    state: 'happy',
    napTime: function() {}.observes('state')
  });
});
