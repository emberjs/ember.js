import { guidFor, setName } from '@ember/-internals/utils';
import CoreObject from '@ember/object/core';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'system/object/toString',
  class extends AbstractTestCase {
    ['@test toString'](assert) {
      let Foo = class extends CoreObject {};
      let foo = Foo.create();

      // simulate these classes being defined on a Namespace
      setName(Foo, 'Foo');

      assert.equal(foo.toString(), '<(unknown):' + guidFor(foo) + '>');
    }
  }
);
