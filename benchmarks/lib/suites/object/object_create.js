/* jshint esnext: true */

import Benchmark from 'benchmark';

export var suite = new Benchmark.Suite('Object - Create');

var ObjType = Ember.Object.extend({ template: function() {}.property('templateName') }),
    obj     = null;

suite.add('Creates an object that was already extended', function(){
  ObjType.create();
});

suite.add('Extends an object an creates it immediately', function() {
  var type = Ember.Object.extend({ template: function() {}.property('templateName') });
  type.create();
});

suite.add('Creates Ember Object', function(){
  obj = Ember.Object.create();
});

suite.add('Creates a native object', function(){
  obj = Object.create({});
});
