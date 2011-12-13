// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals raises */

module('Mixin Methods');

test('defining simple methods', function() {
  
  var MixinA, obj, props;
  
  props = {
    publicMethod: function() { return 'publicMethod'; },
    _privateMethod: function() { return 'privateMethod'; }
  };
  
  MixinA = Ember.Mixin.create(props);
  obj = {};
  MixinA.apply(obj);
  
  // but should be defined
  equals(props.publicMethod(), 'publicMethod', 'publicMethod is func');
  equals(props._privateMethod(), 'privateMethod', 'privateMethod is func');
});

test('overriding public methods', function() {
  var MixinA, MixinB, MixinC, MixinD, MixinE, MixinF, obj;
  
  MixinA = Ember.Mixin.create({
    publicMethod: function() { return 'A'; }
  });
  
  MixinB = Ember.Mixin.create(MixinA, {
    publicMethod: function() { return this._super()+'B'; }
  });

  MixinD = Ember.Mixin.create(MixinA, {
    publicMethod: function() { return this._super()+'D'; }
  });
  
  MixinF = Ember.Mixin.create({
    publicMethod: function() { return this._super()+'F'; }
  });
  
  obj = {};
  MixinB.apply(obj);
  equals(obj.publicMethod(), 'AB', 'should define super for A and B');

  obj = {};
  MixinD.apply(obj);
  equals(obj.publicMethod(), 'AD', 'should define super for A and B');

  obj = {};
  MixinA.apply(obj);
  MixinF.apply(obj);
  equals(obj.publicMethod(), 'AF', 'should define super for A and F');

  obj = { publicMethod: function() { return 'obj'; } };
  MixinF.apply(obj);
  equals(obj.publicMethod(), 'objF', 'should define super for F');
});


test('overriding inherited objects', function() {
  
  var cnt = 0;
  var MixinA = Ember.Mixin.create({
    foo: function() { cnt++; }
  });
  
  var MixinB = Ember.Mixin.create({
    foo: function() { this._super(); cnt++; }
  });

  var objA = {};
  MixinA.apply(objA);
  
  var objB = Ember.create(objA);
  MixinB.apply(objB);
  
  cnt = 0;
  objB.foo();
  equals(cnt, 2, 'should invoke both methods');
  
  cnt = 0;
  objA.foo();
  equals(cnt, 1, 'should not screw w/ parent obj');
});

test('Including the same mixin more than once will only run once', function() {
  var cnt = 0;
  var MixinA = Ember.Mixin.create({
    foo: function() { cnt++; }
  });
  
  var MixinB = Ember.Mixin.create(MixinA, {
    foo: function() { this._super(); }
  });
  
  var MixinC = Ember.Mixin.create(MixinA, {
    foo: function() { this._super(); }
  });

  var MixinD = Ember.Mixin.create(MixinB, MixinC, MixinA, {
    foo: function() { this._super(); }
  });
  
  var obj = {};
  MixinD.apply(obj);
  MixinA.apply(obj); // try to apply again..
  
  cnt = 0;
  obj.foo();
  
  equals(cnt, 1, 'should invoke MixinA.foo one time');
});

// ..........................................................
// CONFLICTS
// 

module('Method Conflicts');


test('overriding toString', function() {
  var MixinA = Ember.Mixin.create({
    toString: function() { return 'FOO'; }
  });
  
  var obj = {};
  MixinA.apply(obj);
  equals(obj.toString(), 'FOO', 'should override toString w/o error');
  
  obj = {};
  Ember.mixin(obj, { toString: function() { return 'FOO'; } });
  equals(obj.toString(), 'FOO', 'should override toString w/o error');
});

// ..........................................................
// BUGS
// 

module('system/mixin/method_test BUGS');

test('applying several mixins at once with sup already defined causes infinite loop', function() {
  
  var cnt = 0;
  var MixinA = Ember.Mixin.create({
    foo: function() { cnt++; }
  });
  
  var MixinB = Ember.Mixin.create({
    foo: function() { this._super(); cnt++; }
  });

  var MixinC = Ember.Mixin.create({
    foo: function() { this._super(); cnt++; }
  });

  var obj = {};
  Ember.mixin(obj, MixinA); // sup already exists
  Ember.mixin(obj, MixinB, MixinC); // must be more than one mixin

  cnt = 0;
  obj.foo();
  equals(cnt, 3, 'should invoke all 3 methods');
});
