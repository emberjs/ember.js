/* jshint esnext:true */

import Benchmark from 'benchmark';

export var suite = new Benchmark.Suite('Object - Create with scalar');

var obj = null;

suite.add('Creates Ember Object with scalar', function(){
  obj = Ember.Object.create({
    foo: 'bar'
  });
});

suite.add('Creates a native object with scalar', function(){
  obj = Object.create({
    foo: 'bar'
  });
});
