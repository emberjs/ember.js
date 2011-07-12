// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals Foo raises $foo */

var obj;
module('SC.setPath', {
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
  SC.setPath(obj, 'foo', "BAM");
  equals(SC.getPath(obj, 'foo'), "BAM");
});

test('[obj, *] -> EXCEPTION [cannot set *]', function() {
  raises(function() {
    SC.setPath(obj, '*', "BAM");
  }, Error);
});

test('[obj, foo.bar] -> obj.foo.bar', function() {
  SC.setPath(obj, 'foo.bar', "BAM");
  equals(SC.getPath(obj, 'foo.bar'), "BAM");
});

test('[obj, foo.*] -> EXCEPTION', function() {
  raises(function() {
    SC.setPath(obj, 'foo.*', "BAM");
  }, Error);
});

test('[obj, foo.*.baz] -> obj.foo.baz', function() {
  SC.setPath(obj, 'foo.*.baz', "BAM");
  equals(SC.getPath(obj, 'foo.baz'), "BAM");
});


test('[obj, foo*bar] -> obj.foo.bar', function() {
  SC.setPath(obj, 'foo*bar', "BAM");
  equals(SC.getPath(obj, 'foo.bar'), "BAM");
});

test('[obj, foo*bar.*] -> EXCEPTION', function() {
  raises(function() {
    SC.setPath(obj, 'foo.*.baz.*', "BAM");
  }, Error);
});

test('[obj, foo.bar*baz.biff] -> obj.foo.bar.baz.biff', function() {
  SC.setPath(obj, 'foo.bar*baz.biff', "BAM");
  equals(SC.getPath(obj, 'foo.bar.baz.biff'), "BAM");
});

test('[obj, this.foo] -> obj.foo', function() {
  SC.setPath(obj, 'this.foo', "BAM");
  equals(SC.getPath(obj, 'foo'), "BAM");
});

test('[obj, this.foo.bar] -> obj.foo.bar', function() {
  SC.setPath(obj, 'this.foo.bar', "BAM");
  equals(SC.getPath(obj, 'foo.bar'), "BAM");
});

test('[obj, .foo.bar] -> obj.foo.bar', function() {
  SC.setPath(obj, '.foo.bar', "BAM");
  equals(SC.getPath(obj, 'foo.bar'), "BAM");
});

test('[obj, *foo.bar] -> obj.foo.bar', function() {
  SC.setPath(obj, '*foo.bar', "BAM");
  equals(SC.getPath(obj, 'foo.bar'), "BAM");
});

test('[obj, this.foo*bar] -> obj.foo.bar', function() {
  SC.setPath(obj, 'this.foo*bar', "BAM");
  equals(SC.getPath(obj, 'foo.bar'), "BAM");
});

test('[obj, this.foo.bar*baz.biff] -> obj.foo.bar.baz.biff', function() {
  SC.setPath(obj, 'this.foo.bar*baz.biff', "BAM");
  equals(SC.getPath(obj, 'foo.bar.baz.biff'), "BAM");
});

// ..........................................................
// GLOBAL PATHS
// 

test('[obj, Foo] -> EXCEPTION', function() {
  raises(function() {
    SC.setPath(obj, 'Foo', "BAM");
  }, Error);
});

test('[obj, foo.baz.bat] -> EXCEPTION', function() {
  raises(function() {
    SC.setPath(obj, 'foo.baz.bat', "BAM");
  }, Error);
});

test('[obj, foo.baz.bat] -> EXCEPTION', function() {
  SC.trySetPath(obj, 'foo.baz.bat', "BAM");
  // does not raise
});

test('[obj, Foo.bar] -> Foo.bar', function() {
  SC.setPath(obj, 'Foo.bar', "BAM");
  equals(SC.getPath(Foo, 'bar'), "BAM");
});

test('[obj, Foo*bar] -> Foo.bar', function() {
  SC.setPath(obj, 'Foo*bar', "BAM");
  equals(SC.getPath(Foo, 'bar'), "BAM");
});

test('[obj, Foo.bar*baz.biff] -> Foo.bar.baz.biff', function() {
  SC.setPath(obj, 'Foo.bar*baz.biff', "BAM");
  equals(SC.getPath(Foo, 'bar.baz.biff'), "BAM");
});

test('[obj, Foo.bar.baz*biff] -> Foo.bar.baz.biff', function() {
  SC.setPath(obj, 'Foo.bar.baz*biff', "BAM");
  equals(SC.getPath(Foo, 'bar.baz.biff'), "BAM");
});

test('[obj, $foo.bar.baz] -> $foo.bar.baz', function() {
  SC.setPath(obj, '$foo.bar.baz', "BAM");
  equals(SC.getPath($foo, 'bar.baz'), "BAM");
});



// ..........................................................
// NO TARGET
// 

test('[null, Foo.bar] -> Foo.bar', function() {
  SC.setPath(null, 'Foo.bar', "BAM");
  equals(SC.getPath(Foo, 'bar'), "BAM");
});

test('[null, Foo*bar] -> Foo.bar', function() {
  SC.setPath(null, 'Foo*bar', "BAM");
  equals(SC.getPath(Foo, 'bar'), "BAM");
});

test('[null, Foo.bar*baz.biff] -> Foo.bar.baz.biff', function() {
  SC.setPath(null, 'Foo.bar*baz.biff', "BAM");
  equals(SC.getPath(Foo, 'bar.baz.biff'), "BAM");
});

test('[null, Foo.bar.baz*biff] -> Foo.bar.baz.biff', function() {
  SC.setPath(null, 'Foo.bar.baz*biff', "BAM");
  equals(SC.getPath(Foo, 'bar.baz.biff'), "BAM");
});
