import { moduleFor, AbstractTestCase } from 'internal-test-helpers';
import { template } from '@ember/template-compiler/runtime';
import { getPrivateFieldReader } from '@ember/-internals/metal';
import { getComponentTemplate, getInternalComponentManager } from '@glimmer/manager';

moduleFor(
  'template',
  class extends AbstractTestCase {
    ['@test template() can be called with the implicit form'](assert: QUnit['assert']) {
      const component = template(`<template>hello</template>`, {
        eval: function () {
          return eval(arguments[0]);
        },
      });

      // This is a smoke test -- integration tests are forthcoming
      const internalTemplate = getComponentTemplate(component);
      assert.ok(internalTemplate, 'template is not null');

      const internalManager = getInternalComponentManager(component);
      assert.ok(internalManager, 'manager is not null');
    }

    ['@test template() registers a private-field reader for `{{this.#field}}` paths'](
      assert: QUnit['assert']
    ) {
      class Greeter {
        #greeting = 'hello';
        readGreeting() {
          return this.#greeting;
        }
        static {
          template('{{this.#greeting}} {{this.#audience}}', {
            component: this,
            eval() {
              return eval(arguments[0]);
            },
          });
        }
        // eslint-disable-next-line no-unused-private-class-members
        #audience = 'world';
      }

      assert.ok(getComponentTemplate(Greeter), 'template is attached to the class');

      let reader = getPrivateFieldReader(new Greeter());
      assert.strictEqual(typeof reader, 'function', 'a reader is registered for the class');
      assert.strictEqual(
        reader!(new Greeter(), 'greeting'),
        'hello',
        'reader reaches the first declared private field'
      );
      assert.strictEqual(
        reader!(new Greeter(), 'audience'),
        'world',
        'reader reaches the second declared private field'
      );
      assert.strictEqual(
        new Greeter().readGreeting(),
        'hello',
        'private field is reachable on instances after compilation'
      );
    }

    ['@test template() throws when private fields are referenced without an `eval`'](
      assert: QUnit['assert']
    ) {
      class Broken {
        // eslint-disable-next-line no-unused-private-class-members
        #greeting = 'hello';
      }

      assert.throws(
        () => template('{{this.#greeting}}', { component: Broken }),
        /private field access/,
        'a clear error is thrown when no eval option is provided'
      );
    }
  }
);
