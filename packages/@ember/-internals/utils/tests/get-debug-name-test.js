import { getDebugName } from '..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';
import { DEBUG } from '@glimmer/env';

if (DEBUG) {
  moduleFor(
    '@ember/-internals/utils getDebugName',
    class extends AbstractTestCase {
      '@test basic'(assert) {
        class Person {}

        assert.strictEqual(getDebugName({}), '(unknown object)');
        assert.strictEqual(
          getDebugName(() => {}),
          '(unknown function)'
        );
        assert.strictEqual(getDebugName(Person), 'Person');
        assert.strictEqual(getDebugName(new Person()), 'Person');
        assert.strictEqual(
          getDebugName(function foo() {}),
          'foo'
        );

        assert.strictEqual(
          getDebugName({
            toString() {
              return 'bar';
            },
          }),
          'bar'
        );

        class ClassWithToString {
          toString() {
            return 'baz';
          }
        }

        assert.strictEqual(getDebugName(ClassWithToString), 'ClassWithToString');
        assert.strictEqual(getDebugName(new ClassWithToString()), 'baz');

        class ClassWithEmberLikeToString {
          toString() {
            return '<some-desc:ember1234>';
          }
        }

        assert.strictEqual(getDebugName(ClassWithEmberLikeToString), 'ClassWithEmberLikeToString');
        assert.strictEqual(
          getDebugName(new ClassWithEmberLikeToString()),
          '<ClassWithEmberLikeToString:ember1234>'
        );

        assert.strictEqual(getDebugName(true), 'true');
        assert.strictEqual(getDebugName(123), '123');
        assert.strictEqual(getDebugName('string'), 'string');
      }
    }
  );
}
