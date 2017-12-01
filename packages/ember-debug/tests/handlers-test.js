import {
  HANDLERS,
  registerHandler,
  invoke
} from '../handlers';

QUnit.module('ember-debug/handlers', {
  teardown() {
    delete HANDLERS.blarz;
  }
});

QUnit.test('calls handler on `invoke` when `falsy`', function(assert) {
  assert.expect(2);

  function handler(message) {
    assert.ok(true, 'called handler');
    assert.equal(message, 'Foo bar');
  }

  registerHandler('blarz', handler);

  invoke('blarz', 'Foo bar', false);
});

QUnit.test('does not call handler on `invoke` when `truthy`', function(assert) {
  assert.expect(0);

  function handler() {
    assert.ok(false, 'called handler');
  }

  registerHandler('blarz', handler);

  invoke('blarz', 'Foo bar', true);
});

QUnit.test('calling `invoke` without handlers does not throw an error', function(assert) {
  assert.expect(0);

  invoke('blarz', 'Foo bar', false);
});

QUnit.test('invoking `next` argument calls the next handler', function(assert) {
  assert.expect(2);

  function handler1(message, options, next) {
    assert.ok(true, 'called handler1');
  }

  function handler2(message, options, next) {
    assert.ok(true, 'called handler2');
    next(message, options);
  }

  registerHandler('blarz', handler1);
  registerHandler('blarz', handler2);

  invoke('blarz', 'Foo', false);
});

QUnit.test('invoking `next` when no other handlers exists does not error', function(assert) {
  assert.expect(1);

  function handler(message, options, next) {
    assert.ok(true, 'called handler1');

    next(message, options);
  }

  registerHandler('blarz', handler);

  invoke('blarz', 'Foo', false);
});

QUnit.test('handlers are called in the proper order', function(assert) {
  assert.expect(11);

  let expectedMessage = 'This is the message';
  let expectedOptions = { id: 'foo-bar' };
  let expected = ['first', 'second', 'third', 'fourth', 'fifth'];
  let actualCalls = [];

  function generateHandler(item) {
    return function(message, options, next) {
      assert.equal(message, expectedMessage, `message supplied to ${item} handler is correct`);
      assert.equal(options, expectedOptions, `options supplied to ${item} handler is correct`);

      actualCalls.push(item);

      next(message, options);
    };
  }

  expected.forEach(item => registerHandler('blarz', generateHandler(item)));

  invoke('blarz', expectedMessage, false, expectedOptions);

  assert.deepEqual(actualCalls, expected.reverse(), 'handlers were called in proper order');
});

QUnit.test('not invoking `next` prevents further handlers from being called', function(assert) {
  assert.expect(1);

  function handler1(message, options, next) {
    assert.ok(false, 'called handler1');
  }

  function handler2(message, options, next) {
    assert.ok(true, 'called handler2');
  }

  registerHandler('blarz', handler1);
  registerHandler('blarz', handler2);

  invoke('blarz', 'Foo', false);
});

QUnit.test('handlers can call `next` with custom message and/or options', function(assert) {
  assert.expect(4);

  let initialMessage = 'initial message';
  let initialOptions = { id: 'initial-options' };

  let handler2Message = 'Handler2 Message';
  let handler2Options = { id: 'handler-2' };

  function handler1(message, options, next) {
    assert.equal(message, handler2Message, 'handler2 message provided to handler1');
    assert.equal(options, handler2Options, 'handler2 options provided to handler1');
  }

  function handler2(message, options, next) {
    assert.equal(message, initialMessage, 'initial message provided to handler2');
    assert.equal(options, initialOptions, 'initial options provided to handler2');

    next(handler2Message, handler2Options);
  }

  registerHandler('blarz', handler1);
  registerHandler('blarz', handler2);

  invoke('blarz', initialMessage, false, initialOptions);
});
