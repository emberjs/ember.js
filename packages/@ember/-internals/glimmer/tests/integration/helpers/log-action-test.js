/*globals MouseEvent */
import { RenderingTestCase, moduleFor } from 'internal-test-helpers';

moduleFor(
  'Helpers test: {{-log-action}}',
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

    ['@test can log as action']() {
      this.render(`<button id='my-btn' onclick={{-log-action}}>Click!</button>`);
      this.$('#my-btn').click();

      this.assert.strictEqual(this.logCalls.length, 1);
      this.assert.ok(this.logCalls[0] instanceof MouseEvent);
    }

    ['@test can log with multiple args']() {
      this.render(`<button id='my-btn' onclick={{-log-action 'rainbow' 45}}>Click!</button>`);
      this.$('#my-btn').click();

      this.assert.strictEqual(this.logCalls.length, 3);
      this.assert.equal(this.logCalls[0], 'rainbow');
      this.assert.equal(this.logCalls[1], 45);
      this.assert.ok(this.logCalls[2] instanceof MouseEvent);
    }

    ['@test can log with reference value']() {
      this.render(`<button id='my-btn' onclick={{-log-action age 'rainbow'}}>Click!</button>`, {
        age: 21,
      });
      this.$('#my-btn').click();

      this.assert.strictEqual(this.logCalls.length, 3);
      this.assert.equal(this.logCalls[0], 21);
      this.assert.equal(this.logCalls[1], 'rainbow');
      this.assert.ok(this.logCalls[2] instanceof MouseEvent);
    }

    ['@test can use with `action` helper combination']() {
      this.render(
        `<button id='my-btn' onclick={{action (action (-log-action age) 'rainbow') 'sun'}}>Click!</button>`,
        { age: 21 }
      );
      this.$('#my-btn').click();

      this.assert.strictEqual(this.logCalls.length, 4);
      this.assert.equal(this.logCalls[0], 21);
      this.assert.equal(this.logCalls[1], 'rainbow');
      this.assert.equal(this.logCalls[2], 'sun');
      this.assert.ok(this.logCalls[3] instanceof MouseEvent);
    }
  }
);
