import { mixin } from './support';
import { Mixin } from 'glimmer-object';

QUnit.module('Mixin.create - Methods');

QUnit.test('defining simple methods', function() {
  let MixinA, obj, props;

  props = {
    publicMethod() { return 'publicMethod'; },
    _privateMethod() { return 'privateMethod'; }
  };

  MixinA = Mixin.create(props);
  obj = {};
  MixinA.apply(obj);

  // but should be defined
  equal(props.publicMethod(), 'publicMethod', 'publicMethod is func');
  equal(props._privateMethod(), 'privateMethod', 'privateMethod is func');
});

QUnit.test('overriding public methods', function() {
  let MixinA, MixinB, MixinD, MixinF, obj;

  MixinA = Mixin.create({
    publicMethod() { return 'A'; }
  });

  MixinB = Mixin.create(MixinA, {
    publicMethod() { return this._super.apply(this, arguments) + 'B'; }
  });

  MixinD = Mixin.create(MixinA, {
    publicMethod() { return this._super.apply(this, arguments) + 'D'; }
  });

  MixinF = Mixin.create({
    publicMethod() { return this._super.apply(this, arguments) + 'F'; }
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

  obj = { publicMethod() { return 'obj'; } };
  MixinF.apply(obj);
  equal(obj.publicMethod(), 'objF', 'should define super for F');
});

QUnit.test('overriding inherited objects', function() {
  let cnt = 0;
  let MixinA = Mixin.create({
    foo() { cnt++; }
  });

  let MixinB = Mixin.create({
    foo() {
      this._super.apply(this, arguments);
      cnt++;
    }
  });

  let objA = {};
  MixinA.apply(objA);

  let objB = Object.create(objA);
  MixinB.apply(objB);

  cnt = 0;
  objB['foo']();
  equal(cnt, 2, 'should invoke both methods');

  cnt = 0;
  objA['foo']();
  equal(cnt, 1, 'should not screw w/ parent obj');
});

QUnit.test('Including the same mixin more than once will only run once', function() {
  let cnt = 0;
  let MixinA = Mixin.create({
    foo() { cnt++; }
  });

  let MixinB = Mixin.create(MixinA, {
    foo() { this._super.apply(this, arguments); }
  });

  let MixinC = Mixin.create(MixinA, {
    foo() { this._super.apply(this, arguments); }
  });

  let MixinD = Mixin.create(MixinB, MixinC, MixinA, {
    foo() { this._super.apply(this, arguments); }
  });

  let obj = {};
  MixinD.apply(obj);
  MixinA.apply(obj); // try to apply again..

  cnt = 0;
  obj['foo']();

  equal(cnt, 1, 'should invoke MixinA.foo one time');
});

QUnit.test('_super from a single mixin with no superclass does not error', function() {
  let MixinA = Mixin.create({
    foo() {
      this._super.apply(this, arguments);
    }
  });

  let obj = {};
  MixinA.apply(obj);

  obj['foo']();
  ok(true);
});

QUnit.test('_super from a first-of-two mixins with no superclass function does not error', function() {
  // _super was previously calling itself in the second assertion.
  // Use remaining count of calls to ensure it doesn't loop indefinitely.
  let remaining = 3;
  let MixinA = Mixin.create({
    foo() {
      if (remaining-- > 0) {
        this._super.apply(this, arguments);
      }
    }
  });

  let MixinB = Mixin.create({
    foo() { this._super.apply(this, arguments); }
  });

  let obj = {};
  MixinA.apply(obj);
  MixinB.apply(obj);

  obj['foo']();
  ok(true);
});

// ..........................................................
// CONFLICTS
//

QUnit.module('Mixin.create - Method Conflicts');

QUnit.test('overriding toString', function() {
  let MixinA = Mixin.create({
    toString() { return 'FOO'; }
  });

  let obj = {};
  MixinA.apply(obj);
  equal(obj.toString(), 'FOO', 'should override toString w/o error');

  obj = {};
  mixin(obj, { toString() { return 'FOO'; } });
  equal(obj.toString(), 'FOO', 'should override toString w/o error');
});

// ..........................................................
// BUGS
//

QUnit.module('Mixin.create - Method Regressions (BUGS)');

QUnit.test('applying several mixins at once with sup already defined causes infinite loop', function() {
  let cnt = 0;
  let MixinA = Mixin.create({
    foo() { cnt++; }
  });

  let MixinB = Mixin.create({
    foo() {
      this._super.apply(this, arguments);
      cnt++;
    }
  });

  let MixinC = Mixin.create({
    foo() {
      this._super.apply(this, arguments);
      cnt++;
    }
  });

  let obj = {};
  mixin(obj, MixinA); // sup already exists
  mixin(obj, MixinB, MixinC); // must be more than one mixin

  cnt = 0;
  obj['foo']();
  equal(cnt, 3, 'should invoke all 3 methods');
});
