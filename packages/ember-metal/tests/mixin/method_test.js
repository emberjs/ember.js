import create from 'ember-metal/platform/create';
import {
  mixin,
  Mixin
} from 'ember-metal/mixin';

QUnit.module('Mixin Methods');

QUnit.test('defining simple methods', function() {

  var MixinA, obj, props;

  props = {
    publicMethod: function() { return 'publicMethod'; },
    _privateMethod: function() { return 'privateMethod'; }
  };

  MixinA = Mixin.create(props);
  obj = {};
  MixinA.apply(obj);

  // but should be defined
  equal(props.publicMethod(), 'publicMethod', 'publicMethod is func');
  equal(props._privateMethod(), 'privateMethod', 'privateMethod is func');
});

QUnit.test('overriding public methods', function() {
  var MixinA, MixinB, MixinD, MixinF, obj;

  MixinA = Mixin.create({
    publicMethod: function() { return 'A'; }
  });

  MixinB = Mixin.create(MixinA, {
    publicMethod: function() { return this._super.apply(this, arguments)+'B'; }
  });

  MixinD = Mixin.create(MixinA, {
    publicMethod: function() { return this._super.apply(this, arguments)+'D'; }
  });

  MixinF = Mixin.create({
    publicMethod: function() { return this._super.apply(this, arguments)+'F'; }
  });

  obj = {};
  MixinB.apply(obj);
  equal(obj.publicMethod(), 'AB', 'should define super for A and B');

  obj = {};
  MixinD.apply(obj);
  equal(obj.publicMethod(), 'AD', 'should define super for A and B');

  obj = {};
  MixinA.apply(obj);
  MixinF.apply(obj);
  equal(obj.publicMethod(), 'AF', 'should define super for A and F');

  obj = { publicMethod: function() { return 'obj'; } };
  MixinF.apply(obj);
  equal(obj.publicMethod(), 'objF', 'should define super for F');
});


QUnit.test('overriding inherited objects', function() {

  var cnt = 0;
  var MixinA = Mixin.create({
    foo: function() { cnt++; }
  });

  var MixinB = Mixin.create({
    foo: function() {
      this._super.apply(this, arguments);
      cnt++;
    }
  });

  var objA = {};
  MixinA.apply(objA);

  var objB = create(objA);
  MixinB.apply(objB);

  cnt = 0;
  objB.foo();
  equal(cnt, 2, 'should invoke both methods');

  cnt = 0;
  objA.foo();
  equal(cnt, 1, 'should not screw w/ parent obj');
});

QUnit.test('Including the same mixin more than once will only run once', function() {
  var cnt = 0;
  var MixinA = Mixin.create({
    foo: function() { cnt++; }
  });

  var MixinB = Mixin.create(MixinA, {
    foo: function() { this._super.apply(this, arguments); }
  });

  var MixinC = Mixin.create(MixinA, {
    foo: function() { this._super.apply(this, arguments); }
  });

  var MixinD = Mixin.create(MixinB, MixinC, MixinA, {
    foo: function() { this._super.apply(this, arguments); }
  });

  var obj = {};
  MixinD.apply(obj);
  MixinA.apply(obj); // try to apply again..

  cnt = 0;
  obj.foo();

  equal(cnt, 1, 'should invoke MixinA.foo one time');
});

QUnit.test('_super from a single mixin with no superclass does not error', function() {
  var MixinA = Mixin.create({
    foo: function() {
      this._super.apply(this, arguments);
    }
  });

  var obj = {};
  MixinA.apply(obj);

  obj.foo();
  ok(true);
});

QUnit.test('_super from a first-of-two mixins with no superclass function does not error', function() {
  // _super was previously calling itself in the second assertion.
  // Use remaining count of calls to ensure it doesn't loop indefinitely.
  var remaining = 3;
  var MixinA = Mixin.create({
    foo: function() {
      if (remaining-- > 0) {
        this._super.apply(this, arguments);
      }
    }
  });

  var MixinB = Mixin.create({
    foo: function() { this._super.apply(this, arguments); }
  });

  var obj = {};
  MixinA.apply(obj);
  MixinB.apply(obj);

  obj.foo();
  ok(true);
});

// ..........................................................
// CONFLICTS
//

QUnit.module('Method Conflicts');


QUnit.test('overriding toString', function() {
  var MixinA = Mixin.create({
    toString: function() { return 'FOO'; }
  });

  var obj = {};
  MixinA.apply(obj);
  equal(obj.toString(), 'FOO', 'should override toString w/o error');

  obj = {};
  mixin(obj, { toString: function() { return 'FOO'; } });
  equal(obj.toString(), 'FOO', 'should override toString w/o error');
});

// ..........................................................
// BUGS
//

QUnit.module('system/mixin/method_test BUGS');

QUnit.test('applying several mixins at once with sup already defined causes infinite loop', function() {

  var cnt = 0;
  var MixinA = Mixin.create({
    foo: function() { cnt++; }
  });

  var MixinB = Mixin.create({
    foo: function() {
      this._super.apply(this, arguments);
      cnt++;
    }
  });

  var MixinC = Mixin.create({
    foo: function() {
      this._super.apply(this, arguments);
      cnt++;
    }
  });

  var obj = {};
  mixin(obj, MixinA); // sup already exists
  mixin(obj, MixinB, MixinC); // must be more than one mixin

  cnt = 0;
  obj.foo();
  equal(cnt, 3, 'should invoke all 3 methods');
});
