import { RenderingTestCase, moduleFor } from 'internal-test-helpers';

moduleFor(
  'Helpers test: {{log}}',
  class extends RenderingTestCase {
    constructor() {
      super(...arguments);
      /* eslint-disable no-console */
      this.originalLog = console.log;
      this.logCalls = [];
      console.log = (...args) => {
        this.logCalls.push(...args);
        /* eslint-enable no-console */
      };
    }

    teardown() {
      super.teardown();
      /* eslint-disable no-console */
      console.log = this.originalLog;
      /* eslint-enable no-console */
    }

    assertLog(values) {
      this.assertText('');
      this.assert.strictEqual(this.logCalls.length, values.length);

      for (let i = 0, len = values.length; i < len; i++) {
        this.assert.strictEqual(this.logCalls[i], values[i]);
      }
    }

    ['@test correctly logs primitives']() {
      this.render(`{{log "one" 1 true}}`);

      this.assertLog(['one', 1, true]);
    }

    ['@test correctly logs a property']() {
      this.render(`{{log value}}`, {
        value: 'one',
      });

      this.assertLog(['one']);
    }

    ['@test correctly logs multiple arguments']() {
      this.render(`{{log "my variable:" value}}`, {
        value: 'one',
      });

      this.assertLog(['my variable:', 'one']);
    }

    ['@test correctly logs `this`']() {
      this.render(`{{log this}}`);

      this.assertLog([this.context]);
    }
  }
);
