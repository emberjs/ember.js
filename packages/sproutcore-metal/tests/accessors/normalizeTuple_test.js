// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals Foo raises $foo */

var obj;
module('Ember.normalizeTuple', {
  setup: function() {
    obj = { 
      foo: { 
        bar: { 
          baz: {} 
        }
      }
    };
    
    Foo = {
      bar: {
        baz: {}
      }
    };
    
    $foo = {
      bar: {
        baz: {}
      }
    };
  }, 
  
  teardown: function() {
    obj = null;
    Foo = null;
  }
});

// ..........................................................
// LOCAL PATHS
// 

test('[obj, foo] -> [obj, foo]', function() {
  same(Ember.normalizeTuple(obj, 'foo'), [obj, 'foo']);
});

test('[obj, *] -> [obj, *]', function() {
  same(Ember.normalizeTuple(obj, '*'), [obj, '*']);
});

test('[obj, foo.bar] -> [obj, foo.bar]', function() {
  same(Ember.normalizeTuple(obj, 'foo.bar'), [obj, 'foo.bar']);
});

test('[obj, foo.*] -> [obj, foo.*]', function() {
  same(Ember.normalizeTuple(obj, 'foo.*'), [obj, 'foo.*']);
});

test('[obj, foo.*.baz] -> [obj, foo.*.baz]', function() {
  same(Ember.normalizeTuple(obj, 'foo.*.baz'), [obj, 'foo.*.baz']);
});


test('[obj, foo*bar] -> [obj.foo, bar]', function() {
  same(Ember.normalizeTuple(obj, 'foo*bar'), [obj.foo, 'bar']);
});

test('[obj, foo*bar.*] -> [obj.foo, bar.*]', function() {
  same(Ember.normalizeTuple(obj, 'foo*bar.*'), [obj.foo, 'bar.*']);
});

test('[obj, foo.bar*baz.biff] -> [obj.foo.bar, baz.biff]', function() {
  same(Ember.normalizeTuple(obj, 'foo.bar*baz.biff'), [obj.foo.bar, 'baz.biff']);
});

test('[obj, foo.bar*baz.biff] -> [obj.foo.bar, baz.biff]', function() {
  same(Ember.normalizeTuple(obj, 'foo.bar*baz.biff'), [obj.foo.bar, 'baz.biff']);
});


test('[obj, this.foo] -> [obj, foo]', function() {
  same(Ember.normalizeTuple(obj, 'this.foo'), [obj, 'foo']);
});

test('[obj, this.foo.bar] -> [obj, foo.bar]', function() {
  same(Ember.normalizeTuple(obj, 'this.foo.bar'), [obj, 'foo.bar']);
});

test('[obj, .foo.bar] -> [obj, foo.bar]', function() {
  same(Ember.normalizeTuple(obj, 'this.foo.bar'), [obj, 'foo.bar']);
});

test('[obj, *foo.bar] -> [obj, foo.bar]', function() {
  same(Ember.normalizeTuple(obj, 'this.foo.bar'), [obj, 'foo.bar']);
});

test('[obj, this.foo*bar] -> [obj.foo, bar]', function() {
  same(Ember.normalizeTuple(obj, 'this.foo*bar'), [obj.foo, 'bar']);
});

test('[obj, this.foo.bar*baz.biff] -> [obj.foo.bar, baz.biff]', function() {
  same(Ember.normalizeTuple(obj, 'this.foo.bar*baz.biff'), [obj.foo.bar, 'baz.biff']);
});

test('[obj, this.foo.bar*baz.biff] -> [obj.foo.bar, baz.biff]', function() {
  same(Ember.normalizeTuple(obj, 'foo.bar*baz.biff'), [obj.foo.bar, 'baz.biff']);
});

test('[obj, this.Foo.bar] -> [obj, Foo.bar]', function() {
  same(Ember.normalizeTuple(obj, 'this.Foo.bar'), [obj, 'Foo.bar']);
});

// ..........................................................
// GLOBAL PATHS
// 

test('[obj, Foo] -> [obj, Foo]', function() {
  same(Ember.normalizeTuple(obj, 'Foo'), [obj, 'Foo']);
});

test('[obj, Foo.bar] -> [Foo, bar]', function() {
  same(Ember.normalizeTuple(obj, 'Foo.bar'), [Foo, 'bar']);
});

test('[obj, Foo*bar] -> [Foo, bar]', function() {
  same(Ember.normalizeTuple(obj, 'Foo*bar'), [Foo, 'bar']);
});

test('[obj, Foo.bar*baz.biff] -> [Foo.bar, baz.biff]', function() {
  same(Ember.normalizeTuple(obj, 'Foo.bar*baz.biff'), [Foo.bar, 'baz.biff']);
});

test('[obj, Foo.bar.baz*biff] -> [Foo.bar.baz, biff]', function() {
  same(Ember.normalizeTuple(obj, 'Foo.bar.baz*biff'), [Foo.bar.baz, 'biff']);
});

test('[obj, $foo.bar.baz] -> [$foo, bar.baz]', function() {
  same(Ember.normalizeTuple(obj, '$foo.bar.baz'), [$foo, 'bar.baz']);
});

// ..........................................................
// NO TARGET
// 

test('[null, Foo] -> EXCEPTION', function() {
  raises(function() {
    Ember.normalizeTuple(null, 'Foo');
  }, Error);
});

test('[null, Foo.bar] -> [Foo, bar]', function() {
  same(Ember.normalizeTuple(null, 'Foo.bar'), [Foo, 'bar']);
});

test('[null, Foo*bar] -> [Foo, bar]', function() {
  same(Ember.normalizeTuple(null, 'Foo*bar'), [Foo, 'bar']);
});

test('[null, Foo.bar*baz.biff] -> [Foo.bar, baz.biff]', function() {
  same(Ember.normalizeTuple(null, 'Foo.bar*baz.biff'), [Foo.bar, 'baz.biff']);
});

test('[null, Foo.bar.baz*biff] -> [Foo.bar.baz, biff]', function() {
  same(Ember.normalizeTuple(null, 'Foo.bar.baz*biff'), [Foo.bar.baz, 'biff']);
});
