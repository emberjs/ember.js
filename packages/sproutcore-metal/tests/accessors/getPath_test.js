// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals Foo raises $foo */

var obj;
module('SC.getPath', {
  setup: function() {
    obj = { 
      foo: { 
        bar: { 
          baz: { biff: 'BIFF' } 
        }
      }
      
    };
    
    Foo = {
      bar: {
        baz: { biff: 'FooBiff' }
      }
    };
    
    $foo = {
      bar: {
        baz: { biff: '$FOOBIFF' }
      }
    };
  }, 
  
  teardown: function() {
    obj = null;
    Foo = null;
    $foo = null;
  }
});

// ..........................................................
// LOCAL PATHS
// 

test('[obj, foo] -> obj.foo', function() {
  same(SC.getPath(obj, 'foo'), obj.foo);
});

test('[obj, *] -> obj', function() {
  same(SC.getPath(obj, '*'), obj);
});

test('[obj, foo.bar] -> obj.foo.bar', function() {
  same(SC.getPath(obj, 'foo.bar'), obj.foo.bar);
});

test('[obj, foo.*] -> obj.foo', function() {
  same(SC.getPath(obj, 'foo.*'), obj.foo);
});

test('[obj, foo.*.baz] -> obj.foo.baz', function() {
  same(SC.getPath(obj, 'foo.*.baz'), obj.foo.baz);
});


test('[obj, foo*bar] -> obj.foo.bar', function() {
  same(SC.getPath(obj, 'foo*bar'), obj.foo.bar);
});

test('[obj, foo*bar.*] -> obj.foo.bar', function() {
  same(SC.getPath(obj, 'foo*bar.*'), obj.foo.bar);
});

test('[obj, foo.bar*baz.biff] -> obj.foo.bar.baz.biff', function() {
  same(SC.getPath(obj, 'foo.bar*baz.biff'), obj.foo.bar.baz.biff);
});

test('[obj, foo.bar*baz.biff] -> obj.foo.bar.baz.biff', function() {
  same(SC.getPath(obj, 'foo.bar*baz.biff'), obj.foo.bar.baz.biff);
});


test('[obj, this.foo] -> obj.foo', function() {
  same(SC.getPath(obj, 'this.foo'), obj.foo);
});

test('[obj, this.foo.bar] -> obj.foo.bar', function() {
  same(SC.getPath(obj, 'this.foo.bar'), obj.foo.bar);
});

test('[obj, .foo.bar] -> obj.foo.bar', function() {
  same(SC.getPath(obj, 'this.foo.bar'), obj.foo.bar);
});

test('[obj, *foo.bar] -> obj.foo.bar', function() {
  same(SC.getPath(obj, 'this.foo.bar'), obj.foo.bar);
});

test('[obj, this.foo*bar] -> obj.foo.bar', function() {
  same(SC.getPath(obj, 'this.foo*bar'), obj.foo.bar);
});

test('[obj, this.foo.bar*baz.biff] -> obj.foo.bar.baz.biff', function() {
  same(SC.getPath(obj, 'this.foo.bar*baz.biff'), obj.foo.bar.baz.biff);
});

test('[obj, this.foo.bar*baz.biff] -> obj.foo.bar.baz.biff', function() {
  same(SC.getPath(obj, 'foo.bar*baz.biff'), obj.foo.bar.baz.biff);
});

test('[obj, this.Foo.bar] -> (null)', function() {
  same(SC.getPath(obj, 'this.Foo.bar'), undefined);
});

// ..........................................................
// GLOBAL PATHS
// 

test('[obj, Foo] -> undefined', function() {
  same(SC.getPath(obj, 'Foo'), undefined);
});

test('[obj, Foo.bar] -> Foo.bar', function() {
  same(SC.getPath(obj, 'Foo.bar'), Foo.bar);
});

test('[obj, Foo*bar] -> Foo.bar', function() {
  same(SC.getPath(obj, 'Foo*bar'), Foo.bar);
});

test('[obj, Foo.bar*baz.biff] -> Foo.bar.baz.biff', function() {
  same(SC.getPath(obj, 'Foo.bar*baz.biff'), Foo.bar.baz.biff);
});

test('[obj, Foo.bar.baz*biff] -> Foo.bar.baz.biff', function() {
  same(SC.getPath(obj, 'Foo.bar.baz*biff'), Foo.bar.baz.biff);
});

test('[obj, $foo.bar.baz] -> $foo.bar.baz', function() {
  same(SC.getPath(obj, '$foo.bar.baz'), $foo.bar.baz);
});

// ..........................................................
// NO TARGET
// 

test('[null, Foo] -> Foo', function() {
  same(SC.getPath('Foo'), Foo);
});

test('[null, Foo.bar] -> Foo.bar', function() {
  same(SC.getPath('Foo.bar'), Foo.bar);
});

test('[null, Foo*bar] -> Foo.bar', function() {
  same(SC.getPath('Foo*bar'), Foo.bar);
});

test('[null, Foo.bar*baz.biff] -> Foo.bar.baz.biff', function() {
  same(SC.getPath('Foo.bar*baz.biff'), Foo.bar.baz.biff);
});

test('[null, Foo.bar.baz*biff] -> Foo.bar.baz.biff', function() {
  same(SC.getPath('Foo.bar.baz*biff'), Foo.bar.baz.biff);
});
