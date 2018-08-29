import { meta } from 'ember-meta';
import { notifyPropertyChange, PROPERTY_DID_CHANGE } from '..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'notifyPropertyChange',
  class extends AbstractTestCase {
    ['@test notifies property changes on instances'](assert) {
      class Foo {
        [PROPERTY_DID_CHANGE](prop) {
          assert.equal(prop, 'bar', 'property change notified');
        }
      }

      let foo = new Foo();

      notifyPropertyChange(foo, 'bar');
    }

    ['@test notifies property changes on instances with meta'](assert) {
      class Foo {
        [PROPERTY_DID_CHANGE](prop) {
          assert.equal(prop, 'bar', 'property change notified');
        }
      }

      let foo = new Foo();

      meta(foo); // setup meta

      notifyPropertyChange(foo, 'bar');
    }

    ['@test does not notify on class prototypes with meta'](assert) {
      assert.expect(0);

      class Foo {
        [PROPERTY_DID_CHANGE](prop) {
          assert.equal(prop, 'bar', 'property change notified');
        }
      }

      let foo = new Foo();

      meta(foo.constructor.prototype); // setup meta for prototype

      notifyPropertyChange(foo.constructor.prototype, 'bar');
    }

    ['@test does not notify on non-class prototypes with meta'](assert) {
      assert.expect(0);

      let foo = {
        [PROPERTY_DID_CHANGE](prop) {
          assert.equal(prop, 'baz', 'property change notified');
        },
      };

      let bar = Object.create(foo);

      meta(foo); // setup meta for prototype
      meta(bar); // setup meta for instance, switch prototype

      notifyPropertyChange(foo, 'baz');
    }
  }
);
