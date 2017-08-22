import { RenderTests, module, test } from '@glimmer/test-helpers';
import { setDebuggerCallback } from '@glimmer/runtime';

class DebuggerTests extends RenderTests {
  @test "basic debugger statement"() {
    let expectedContext = {
      foo: 'bar',
      a: {
        b: true
      }
    };
    let callbackExecuted = 0;

    setDebuggerCallback((context: any, get) => {
      callbackExecuted++;
      this.assert.equal(context.foo, expectedContext.foo);
      this.assert.equal(get('foo'), expectedContext.foo);
    });

    this.render('{{#if a.b}}true{{debugger}}{{else}}false{{debugger}}{{/if}}', expectedContext);
    this.assert.equal(callbackExecuted, 1);
    this.assertHTML('true');
    this.assertStableRerender();

    expectedContext = {
      foo: 'baz',
      a: {
        b: false
      }
    };
    this.rerender(expectedContext);
    this.assert.equal(callbackExecuted, 2);
    this.assertHTML('false');
    this.assertStableNodes();

    expectedContext = {
      foo: 'bar',
      a: {
        b: true
      }
    };
    this.rerender(expectedContext);
    this.assert.equal(callbackExecuted, 3);
    this.assertHTML('true');
    this.assertStableNodes();
  }

  @test "can get locals"() {
    let expectedContext = {
      foo: 'bar',
      a: {
        b: true
      }
    };
    let callbackExecuted = 0;

    setDebuggerCallback((context: any, get) => {
      callbackExecuted++;
      this.assert.equal(get('foo'), expectedContext.foo);
      this.assert.equal(get('bar'), expectedContext.foo);
      this.assert.deepEqual(get('this'), context);
    });

    this.render('{{#with foo as |bar|}}{{#if a.b}}true{{debugger}}{{else}}false{{debugger}}{{/if}}{{/with}}', expectedContext);
    this.assert.equal(callbackExecuted, 1);
    this.assertHTML('true');
    this.assertStableRerender();

    expectedContext = {
      foo: 'baz',
      a: {
        b: false
      }
    };
    this.rerender(expectedContext);
    this.assert.equal(callbackExecuted, 2);
    this.assertHTML('false');
    this.assertStableNodes();

    expectedContext = {
      foo: 'bar',
      a: {
        b: true
      }
    };
    this.rerender(expectedContext);
    this.assert.equal(callbackExecuted, 3);
    this.assertHTML('true');
    this.assertStableNodes();
  }
}
module("Debugger Tests", DebuggerTests);
