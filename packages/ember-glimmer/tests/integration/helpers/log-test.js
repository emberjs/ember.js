import { RenderingTest, moduleFor } from '../../utils/test-case';
import Logger from 'ember-console';


moduleFor('Helpers test: {{log}}', class extends RenderingTest {

  constructor(assert) {
    super();

    this.originalLog = Logger.log;
    this.logCalls = [];
    Logger.log = (...args) => {
      this.logCalls.push(...args);
    };
  }

  teardown() {
    super.teardown();
    Logger.log = this.originalLog;
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
      value: 'one'
    });

    this.assertLog(['one']);
  }

  ['@test correctly logs multiple arguments']() {
    this.render(`{{log "my variable:" value}}`, {
      value: 'one'
    });

    this.assertLog(['my variable:', 'one']);
  }

  ['@test correctly logs `this`']() {
    this.render(`{{log this}}`);

    this.assertLog([this.context]);
  }

});
