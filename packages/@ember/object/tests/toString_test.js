import { guidFor, setName } from '@ember/-internals/utils';
import EmberObject from '@ember/object';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'system/object/toString',
  class extends AbstractTestCase {
    ['@test toString includes toStringExtension if defined'](assert) {
      let Foo = EmberObject.extend({
        toStringExtension() {
          return 'fooey';
        },
      });
      let foo = Foo.create();
      let Bar = EmberObject.extend({});
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
