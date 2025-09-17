import { guidFor, setName } from '@ember/-internals/utils';
import CoreObject from '@ember/object/core';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'system/object/toString',
  class extends AbstractTestCase {
    ['@test toString includes toStringExtension if defined'](assert) {
      let Foo = class extends CoreObject {
        toStringExtension() {
          return 'fooey';
        }
      };
      let foo = Foo.create();
      let Bar = class extends CoreObject {};
      let bar = Bar.create();

      // simulate these classes being defined on a Namespace
      setName(Foo, 'Foo');
      setName(Bar, 'Bar');

      assert.equal(
        bar.toString(),
        '<(unknown):' + guidFor(bar) + '>',
        'does not include toStringExtension part'
      );
      assert.equal(
        foo.toString(),
        '<(unknown):' + guidFor(foo) + ':fooey>',
        'Includes toStringExtension result'
      );
    }
  }
);
