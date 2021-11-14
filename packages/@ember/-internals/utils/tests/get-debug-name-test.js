import { getDebugName } from '..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';
import { DEBUG } from '@glimmer/env';

if (DEBUG) {
  moduleFor(
    '@ember/-internals/utils getDebugName',
    class extends AbstractTestCase {
      '@test basic'(assert) {
        class Person {}

        assert.equal(getDebugName({}), '(unknown object)');
        assert.equal(
          getDebugName(() => {}),
          '(unknown function)'
        );
        assert.equal(getDebugName(Person), 'Person');
        assert.equal(getDebugName(new Person()), 'Person');
        assert.equal(
          getDebugName(function foo() {}),
          'foo'
        );

        assert.equal(
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

        assert.equal(getDebugName(ClassWithToString), 'ClassWithToString');
        assert.equal(getDebugName(new ClassWithToString()), 'baz');

        class ClassWithEmberLikeToString {
          toString() {
            return '<some-desc:ember1234>';
          }
        }

        assert.equal(getDebugName(ClassWithEmberLikeToString), 'ClassWithEmberLikeToString');
        assert.equal(
          getDebugName(new ClassWithEmberLikeToString()),
          '<ClassWithEmberLikeToString:ember1234>'
        );

        assert.equal(getDebugName(true), 'true');
        assert.equal(getDebugName(123), '123');
        assert.equal(getDebugName('string'), 'string');
      }
    }
  );
}
