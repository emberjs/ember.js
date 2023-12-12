import Mixin, { mixin } from '@ember/object/mixin';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'Mixin Methods',
  class extends AbstractTestCase {
    ['@test defining simple methods'](assert) {
      let MixinA, obj, props;

      props = {
        publicMethod() {
          return 'publicMethod';
        },
        _privateMethod() {
          return 'privateMethod';
        },
      };

      MixinA = Mixin.create(props);
      obj = {};
      MixinA.apply(obj);

      // but should be defined
      assert.equal(props.publicMethod(), 'publicMethod', 'publicMethod is func');
      assert.equal(props._privateMethod(), 'privateMethod', 'privateMethod is func');
    }

    ['@test overriding public methods'](assert) {
      let MixinA, MixinB, MixinD, MixinF, obj;

      MixinA = Mixin.create({
        publicMethod() {
          return 'A';
        },
      });

      MixinB = Mixin.create(MixinA, {
        publicMethod() {
          return this._super(...arguments) + 'B';
        },
      });

      MixinD = Mixin.create(MixinA, {
        publicMethod() {
          return this._super(...arguments) + 'D';
        },
      });

      MixinF = Mixin.create({
        publicMethod() {
          return this._super(...arguments) + 'F';
        },
      });

      obj = {};
      MixinB.apply(obj);
      assert.equal(obj.publicMethod(), 'AB', 'should define super for A and B');

      obj = {};
      MixinD.apply(obj);
      assert.equal(obj.publicMethod(), 'AD', 'should define super for A and B');

      obj = {};
      MixinA.apply(obj);
      MixinF.apply(obj);
      assert.equal(obj.publicMethod(), 'AF', 'should define super for A and F');

      obj = {
        publicMethod() {
          return 'obj';
        },
      };
      MixinF.apply(obj);
      assert.equal(obj.publicMethod(), 'objF', 'should define super for F');
    }

    ['@test overriding inherited objects'](assert) {
      let cnt = 0;
      let MixinA = Mixin.create({
        foo() {
          cnt++;
        },
      });

      let MixinB = Mixin.create({
        foo() {
          this._super(...arguments);
          cnt++;
        },
      });

      let objA = {};
      MixinA.apply(objA);

      let objB = Object.create(objA);
      MixinB.apply(objB);

      cnt = 0;
      objB.foo();
      assert.equal(cnt, 2, 'should invoke both methods');

      cnt = 0;
      objA.foo();
      assert.equal(cnt, 1, 'should not screw w/ parent obj');
    }

    ['@test Including the same mixin more than once will only run once'](assert) {
      let cnt = 0;
      let MixinA = Mixin.create({
        foo() {
          cnt++;
        },
      });

      let MixinB = Mixin.create(MixinA, {
        foo() {
          this._super(...arguments);
        },
      });

      let MixinC = Mixin.create(MixinA, {
        foo() {
          this._super(...arguments);
        },
      });

      let MixinD = Mixin.create(MixinB, MixinC, MixinA, {
        foo() {
          this._super(...arguments);
        },
      });

      let obj = {};
      MixinD.apply(obj);
      MixinA.apply(obj); // try to apply again..

      cnt = 0;
      obj.foo();

      assert.equal(cnt, 1, 'should invoke MixinA.foo one time');
    }

    ['@test _super from a single mixin with no superclass does not error'](assert) {
      let MixinA = Mixin.create({
        foo() {
          this._super(...arguments);
        },
      });

      let obj = {};
      MixinA.apply(obj);

      obj.foo();
      assert.ok(true);
    }

    ['@test _super from a first-of-two mixins with no superclass function does not error'](assert) {
      // _super was previously calling itself in the second assertion.
      // Use remaining count of calls to ensure it doesn't loop indefinitely.
      let remaining = 3;
      let MixinA = Mixin.create({
        foo() {
          if (remaining-- > 0) {
            this._super(...arguments);
          }
        },
      });

      let MixinB = Mixin.create({
        foo() {
          this._super(...arguments);
        },
      });

      let obj = {};
      MixinA.apply(obj);
      MixinB.apply(obj);

      obj.foo();
      assert.ok(true);
    }
  }
);

// ..........................................................
// CONFLICTS
//
moduleFor(
  'Method Conflicts',
  class extends AbstractTestCase {
    ['@test overriding toString'](assert) {
      let MixinA = Mixin.create({
        toString() {
          return 'FOO';
        },
      });

      let obj = {};
      MixinA.apply(obj);
      assert.equal(obj.toString(), 'FOO', 'should override toString w/o error');

      obj = {};
      mixin(obj, {
        toString() {
          return 'FOO';
        },
      });
      assert.equal(obj.toString(), 'FOO', 'should override toString w/o error');
    }
  }
);

// ..........................................................
// BUGS
//
moduleFor(
  'system/mixin/method_test BUGS',
  class extends AbstractTestCase {
    ['@test applying several mixins at once with sup already defined causes infinite loop'](
      assert
    ) {
      let cnt = 0;
      let MixinA = Mixin.create({
        foo() {
          cnt++;
        },
      });

      let MixinB = Mixin.create({
        foo() {
          this._super(...arguments);
          cnt++;
        },
      });

      let MixinC = Mixin.create({
        foo() {
          this._super(...arguments);
          cnt++;
        },
      });

      let obj = {};
      mixin(obj, MixinA); // sup already exists
      mixin(obj, MixinB, MixinC); // must be more than one mixin

      cnt = 0;
      obj.foo();
      assert.equal(cnt, 3, 'should invoke all 3 methods');
    }
  }
);
