import {
  moduleFor,
  AutobootApplicationTestCase
} from 'internal-test-helpers';

import { Route } from 'ember-routing';
import {
  Controller,
  RSVP
} from 'ember-runtime';
import { run } from 'ember-metal';
import { jQuery } from 'ember-views';
import {
  Component,
} from 'ember-glimmer';

import Test from '../test';
import setupForTesting from '../setup_for_testing';

import {
  pendingRequests,
  incrementPendingRequests,
  clearPendingRequests
} from '../test/pending_requests';
import {
  setAdapter,
  getAdapter
} from '../test/adapter';
import {
  registerWaiter,
  unregisterWaiter
} from '../test/waiters';

function registerHelper() {
  Test.registerHelper('LeakyMcLeakLeak', () => {});
}

function assertHelpers(assert, application, helperContainer, expected) {
  if (!helperContainer) { helperContainer = window; }
  if (expected === undefined) { expected = true; }

  function checkHelperPresent(helper, expected) {
    var presentInHelperContainer = !!helperContainer[helper];
    var presentInTestHelpers = !!application.testHelpers[helper];

    assert.ok(
      presentInHelperContainer === expected,
      'Expected \'' + helper + '\' to be present in the helper container (defaults to window).'
    );
    assert.ok(
      presentInTestHelpers === expected,
      'Expected \'' + helper + '\' to be present in App.testHelpers.'
    );
  }

  checkHelperPresent('visit', expected);
  checkHelperPresent('click', expected);
  checkHelperPresent('keyEvent', expected);
  checkHelperPresent('fillIn', expected);
  checkHelperPresent('wait', expected);
  checkHelperPresent('triggerEvent', expected);
}

function assertNoHelpers(assert, application, helperContainer) {
  assertHelpers(assert, application, helperContainer, false);
}

class HelpersTestCase extends AutobootApplicationTestCase {

  constructor() {
    super();
    this._originalAdapter = getAdapter();
  }

  teardown() {
    setAdapter(this._originalAdapter);
    jQuery(document).off('ajaxSend');
    jQuery(document).off('ajaxComplete');
    clearPendingRequests();
    if (this.application) {
      this.application.removeTestHelpers();
    }
    super.teardown();
  }

}

class HelpersApplicationTestCase extends HelpersTestCase {
  constructor() {
    super();
    this.runTask(() => {
      this.createApplication();
      this.application.setupForTesting();
      this.application.injectTestHelpers();
    });
  }
}

moduleFor('ember-testing: Helper setup', class extends HelpersTestCase {

  [`@test Ember.Application#injectTestHelpers/#removeTestHelper`](assert) {
    this.runTask(() => {
      this.createApplication();
    });

    assertNoHelpers(assert, this.application);

    registerHelper();

    this.application.injectTestHelpers();

    assertHelpers(assert, this.application);

    assert.ok(
      Test.Promise.prototype.LeakyMcLeakLeak,
      'helper in question SHOULD be present'
    );

    this.application.removeTestHelpers();

    assertNoHelpers(assert, this.application);

    assert.equal(
      Test.Promise.prototype.LeakyMcLeakLeak, undefined,
      'should NOT leak test promise extensions'
    );
  }

  [`@test Ember.Application#setupForTesting`](assert) {
    this.runTask(() => {
      this.createApplication();
      this.application.setupForTesting();
    });

    let routerInstance = this.applicationInstance.lookup('router:main');
    assert.equal(routerInstance.location, 'none');
  }

  [`@test Ember.Application.setupForTesting sets the application to 'testing'`](assert) {
    this.runTask(() => {
      this.createApplication();
      this.application.setupForTesting();
    });

    assert.equal(
      this.application.testing, true,
      'Application instance is set to testing.'
    );
  }

  [`@test Ember.Application.setupForTesting leaves the system in a deferred state.`](assert) {
    this.runTask(() => {
      this.createApplication();
      this.application.setupForTesting();
    });

    assert.equal(
      this.application._readinessDeferrals, 1,
      'App is in deferred state after setupForTesting.'
    );
  }

  [`@test App.reset() after Application.setupForTesting leaves the system in a deferred state.`](assert) {
    this.runTask(() => {
      this.createApplication();
      this.application.setupForTesting();
    });

    assert.equal(
      this.application._readinessDeferrals, 1,
      'App is in deferred state after setupForTesting.'
    );

    this.application.reset();

    assert.equal(
      this.application._readinessDeferrals, 1,
      'App is in deferred state after setupForTesting.'
    );
  }

  [`@test #setupForTesting attaches ajax listeners`](assert) {
    let documentEvents = jQuery._data(document, 'events') || {};

    assert.ok(
      documentEvents['ajaxSend'] === undefined,
      'there are no ajaxSend listers setup prior to calling injectTestHelpers'
    );
    assert.ok(
      documentEvents['ajaxComplete'] === undefined,
      'there are no ajaxComplete listers setup prior to calling injectTestHelpers'
    );

    setupForTesting();

    documentEvents = jQuery._data(document, 'events');

    assert.equal(
      documentEvents['ajaxSend'].length, 1,
      'calling injectTestHelpers registers an ajaxSend handler'
    );
    assert.equal(
      documentEvents['ajaxComplete'].length, 1,
      'calling injectTestHelpers registers an ajaxComplete handler'
    );
  }

  [`@test #setupForTesting attaches ajax listeners only once`](assert) {
    let documentEvents = jQuery._data(document, 'events') || {};

    assert.ok(
      documentEvents['ajaxSend'] === undefined,
      'there are no ajaxSend listeners setup prior to calling injectTestHelpers'
    );
    assert.ok(
      documentEvents['ajaxComplete'] === undefined,
      'there are no ajaxComplete listeners setup prior to calling injectTestHelpers'
    );

    setupForTesting();
    setupForTesting();

    documentEvents = jQuery._data(document, 'events');

    assert.equal(
      documentEvents['ajaxSend'].length, 1,
      'calling injectTestHelpers registers an ajaxSend handler'
    );
    assert.equal(
      documentEvents['ajaxComplete'].length, 1,
      'calling injectTestHelpers registers an ajaxComplete handler'
    );
  }

  [`@test Ember.Application#injectTestHelpers calls callbacks registered with onInjectHelpers`](assert) {
    let injected = 0;

    Test.onInjectHelpers(() => {
      injected++;
    });

    this.runTask(() => {
      this.createApplication();
      this.application.setupForTesting();
    });

    assert.equal(
      injected, 0,
      'onInjectHelpers are not called before injectTestHelpers'
    );

    this.application.injectTestHelpers();

    assert.equal(
      injected, 1,
      'onInjectHelpers are called after injectTestHelpers'
    );
  }

  [`@test Ember.Application#injectTestHelpers adds helpers to provided object.`](assert) {
    let helpers = {};

    this.runTask(() => {
      this.createApplication();
      this.application.setupForTesting();
    });

    this.application.injectTestHelpers(helpers);

    assertHelpers(assert, this.application, helpers);

    this.application.removeTestHelpers();

    assertNoHelpers(assert, this.application, helpers);
  }

  [`@test Ember.Application#removeTestHelpers resets the helperContainer\'s original values`](assert) {
    let helpers = { visit: 'snazzleflabber' };

    this.runTask(() => {
      this.createApplication();
      this.application.setupForTesting();
    });

    this.application.injectTestHelpers(helpers);

    assert.notEqual(
      helpers.visit, 'snazzleflabber',
      'helper added to container'
    );
    this.application.removeTestHelpers();

    assert.equal(
      helpers.visit, 'snazzleflabber',
      'original value added back to container'
    );
  }

});

moduleFor('ember-testing: Helper methods', class extends HelpersApplicationTestCase {

  [`@test 'wait' respects registerWaiters`](assert) {
    assert.expect(3);

    let counter = 0;
    function waiter() {
      return ++counter > 2;
    }

    let other = 0;
    function otherWaiter() {
      return ++other > 2;
    }

    this.runTask(() => {
      this.application.advanceReadiness();
    });

    registerWaiter(waiter);
    registerWaiter(otherWaiter);

    let {application: {testHelpers}} = this;
    return testHelpers.wait().then(() => {
      assert.equal(
        waiter(), true,
        'should not resolve until our waiter is ready'
      );
      unregisterWaiter(waiter);
      counter = 0;
      return testHelpers.wait();
    }).then(() => {
      assert.equal(
        counter, 0,
        'unregistered waiter was not checked'
      );
      assert.equal(
        otherWaiter(), true,
        'other waiter is still registered'
      );
    }).finally(() => {
      unregisterWaiter(otherWaiter);
    });
  }

  [`@test 'visit' advances readiness.`](assert) {
    assert.expect(2);

    assert.equal(
      this.application._readinessDeferrals, 1,
      'App is in deferred state after setupForTesting.'
    );

    return this.application.testHelpers.visit('/').then(() => {
      assert.equal(
        this.application._readinessDeferrals, 0,
        `App's readiness was advanced by visit.`
      );
    });
  }

  [`@test 'wait' helper can be passed a resolution value`](assert) {
    assert.expect(4);

    this.runTask(() => {
      this.application.advanceReadiness();
    });

    let promiseObjectValue = {};
    let objectValue = {};
    let {application: {testHelpers}} = this;
    return testHelpers.wait('text').then(val => {
      assert.equal(
        val, 'text',
        'can resolve to a string'
      );
      return testHelpers.wait(1);
    }).then(val => {
      assert.equal(
        val, 1,
        'can resolve to an integer'
      );
      return testHelpers.wait(objectValue);
    }).then(val => {
      assert.equal(
        val, objectValue,
        'can resolve to an object'
      );
      return testHelpers.wait(RSVP.resolve(promiseObjectValue));
    }).then(val => {
      assert.equal(
        val, promiseObjectValue,
        'can resolve to a promise resolution value'
      );
    });
  }

  [`@test 'click' triggers appropriate events in order`](assert) {
    assert.expect(5);

    this.add('component:index-wrapper', Component.extend({
      classNames: 'index-wrapper',

      didInsertElement() {
        this.$().on('mousedown focusin mouseup click', e => {
          events.push(e.type);
        });
      }
    }));

    this.add('component:x-checkbox', Component.extend({
      tagName: 'input',
      attributeBindings: ['type'],
      type: 'checkbox',
      click() {
        events.push('click:' + this.get('checked'));
      },
      change() {
        events.push('change:' + this.get('checked'));
      }
    }));

    this.addTemplate('index', `
      {{#index-wrapper}}
        {{input type="text"}}
        {{x-checkbox type="checkbox"}}
        {{textarea}}
        <div contenteditable="true"> </div>
      {{/index-wrapper}}'));
    `);

    this.runTask(() => {
      this.application.advanceReadiness();
    });

    let events;
    let {application: {testHelpers}} = this;
    return testHelpers.wait().then(() => {
      events = [];
      return testHelpers.click('.index-wrapper');
    }).then(() => {
      assert.deepEqual(
        events, ['mousedown', 'mouseup', 'click'],
        'fires events in order'
      );
    }).then(() => {
      events = [];
      return testHelpers.click('.index-wrapper input[type=text]');
    }).then(() => {
      assert.deepEqual(
        events, ['mousedown', 'focusin', 'mouseup', 'click'],
        'fires focus events on inputs'
      );
    }).then(() => {
      events = [];
      return testHelpers.click('.index-wrapper textarea');
    }).then(() => {
      assert.deepEqual(
        events, ['mousedown', 'focusin', 'mouseup', 'click'],
        'fires focus events on textareas'
      );
    }).then(() => {
      events = [];
      return testHelpers.click('.index-wrapper div');
    }).then(() => {
      assert.deepEqual(
        events, ['mousedown', 'focusin', 'mouseup', 'click'],
        'fires focus events on contenteditable'
      );
    }).then(() => {
      events = [];
      return testHelpers.click('.index-wrapper input[type=checkbox]');
    }).then(() => {
      // i.e. mousedown, mouseup, change:true, click, click:true
      // Firefox differs so we can't assert the exact ordering here.
      // See https://bugzilla.mozilla.org/show_bug.cgi?id=843554.
      assert.equal(
        events.length, 5,
        'fires click and change on checkboxes'
      );
    });
  }

  [`@test 'click' triggers native events with simulated X/Y coordinates`](assert) {
    assert.expect(15);

    this.add('component:index-wrapper', Component.extend({
      classNames: 'index-wrapper',

      didInsertElement() {
        let pushEvent  = e => events.push(e);
        this.element.addEventListener('mousedown', pushEvent);
        this.element.addEventListener('mouseup', pushEvent);
        this.element.addEventListener('click', pushEvent);
      }
    }));

    this.addTemplate('index', `
      {{#index-wrapper}}some text{{/index-wrapper}}
    `);

    this.runTask(() => {
      this.application.advanceReadiness();
    });

    let events;
    let {application: {testHelpers: {wait, click}}} = this;
    return wait().then(() => {
      events = [];
      return click('.index-wrapper');
    }).then(() => {
      events.forEach(e => {
        assert.ok(
          e instanceof window.Event,
          'The event is an instance of MouseEvent'
        );
        assert.ok(
          typeof e.screenX === 'number',
          'screenX is correct'
        );
        assert.ok(
          typeof e.screenY === 'number',
          'screenY is correct'
        );
        assert.ok(
          typeof e.clientX === 'number',
          'clientX is correct'
        );
        assert.ok(
          typeof e.clientY === 'number',
          'clientY is correct'
        );
      });
    });
  }

  [`@test 'triggerEvent' with mouseenter triggers native events with simulated X/Y coordinates`](assert) {
    assert.expect(5);

    let evt;
    this.add('component:index-wrapper', Component.extend({
      classNames: 'index-wrapper',
      didInsertElement() {
        this.element.addEventListener('mouseenter', e => evt = e);
      }
    }));

    this.addTemplate('index', `{{#index-wrapper}}some text{{/index-wrapper}}`);

    this.runTask(() => {
      this.application.advanceReadiness();
    });

    let {application: {testHelpers: {wait, triggerEvent}}} = this;
    return wait().then(() => {
      return triggerEvent('.index-wrapper', 'mouseenter');
    }).then(() => {
      assert.ok(
        evt instanceof window.Event,
        'The event is an instance of MouseEvent'
      );
      assert.ok(
        typeof evt.screenX === 'number',
        'screenX is correct'
      );
      assert.ok(
        typeof evt.screenY === 'number',
        'screenY is correct'
      );
      assert.ok(
        typeof evt.clientX === 'number',
        'clientX is correct'
      );
      assert.ok(
        typeof evt.clientY === 'number',
        'clientY is correct'
      );
    });
  }

  [`@test 'wait' waits for outstanding timers`](assert) {
    assert.expect(1);

    this.runTask(() => {
      this.application.advanceReadiness();
    });

    let waitDone = false;
    run.later(() => {
      waitDone = true;
    }, 20);

    return this.application.testHelpers.wait().then(() => {
      assert.equal(waitDone, true, 'should wait for the timer to be fired.');
    });
  }

  [`@test 'wait' respects registerWaiters with optional context`](assert) {
    assert.expect(3);

    let obj = {
      counter: 0,
      ready() {
        return ++this.counter > 2;
      }
    };

    let other = 0;
    function otherWaiter() {
      return ++other > 2;
    }

    this.runTask(() => {
      this.application.advanceReadiness();
    });

    registerWaiter(obj, obj.ready);
    registerWaiter(otherWaiter);

    let {application: {testHelpers: {wait}}} = this;
    return wait().then(() => {
      assert.equal(
        obj.ready(), true,
        'should not resolve until our waiter is ready'
      );
      unregisterWaiter(obj, obj.ready);
      obj.counter = 0;
      return wait();
    }).then(() => {
      assert.equal(
        obj.counter, 0,
        'the unregistered waiter should still be at 0'
      );
      assert.equal(
        otherWaiter(), true,
        'other waiter should still be registered'
      );
    }).finally(() => {
      unregisterWaiter(otherWaiter);
    });
  }

  [`@test 'wait' does not error if routing has not begun`](assert) {
    assert.expect(1);

    return this.application.testHelpers.wait().then(() => {
      ok(true, 'should not error without `visit`');
    });
  }

  [`@test 'triggerEvent' accepts an optional options hash without context`](assert) {
    assert.expect(3);

    let event;
    this.add('component:index-wrapper', Component.extend({
      didInsertElement() {
        this.$('.input').on('keydown change', e => event = e);
      }
    }));

    this.addTemplate('index', `{{index-wrapper}}`);
    this.addTemplate('components/index-wrapper', `
      {{input type="text" id="scope" class="input"}}
    `);

    this.runTask(() => {
      this.application.advanceReadiness();
    });

    let {application: {testHelpers: {wait, triggerEvent}}} = this;
    return wait().then(() => {
      return triggerEvent('.input', 'keydown', { keyCode: 13 });
    }).then(() => {
      assert.equal(event.keyCode, 13, 'options were passed');
      assert.equal(event.type, 'keydown', 'correct event was triggered');
      assert.equal(event.target.getAttribute('id'), 'scope', 'triggered on the correct element');
    });
  }

  [`@test 'triggerEvent' can limit searching for a selector to a scope`](assert) {
    assert.expect(2);

    let event;
    this.add('component:index-wrapper', Component.extend({
      didInsertElement() {
        this.$('.input').on('blur change', e => event = e);
      }
    }));

    this.addTemplate('components/index-wrapper', `
      {{input type="text" id="outside-scope" class="input"}}
      <div id="limited">
        {{input type="text" id="inside-scope" class="input"}}
      </div>
    `);
    this.addTemplate('index', `{{index-wrapper}}`);

    this.runTask(() => {
      this.application.advanceReadiness();
    });

    let {application: {testHelpers: {wait, triggerEvent}}} = this;
    return wait().then(() => {
      return triggerEvent('.input', '#limited', 'blur');
    }).then(() => {
      assert.equal(
        event.type, 'blur',
        'correct event was triggered'
      );
      assert.equal(
        event.target.getAttribute('id'), 'inside-scope',
        'triggered on the correct element'
      );
    });
  }

  [`@test 'triggerEvent' can be used to trigger arbitrary events`](assert) {
    assert.expect(2);

    let event;
    this.add('component:index-wrapper', Component.extend({
      didInsertElement() {
        this.$('#foo').on('blur change', e => event = e);
      }
    }));

    this.addTemplate('components/index-wrapper', `
      {{input type="text" id="foo"}}
    `);
    this.addTemplate('index', `{{index-wrapper}}`);

    this.runTask(() => {
      this.application.advanceReadiness();
    });

    let {application: {testHelpers: {wait, triggerEvent}}} = this;
    return wait().then(() => {
      return triggerEvent('#foo', 'blur');
    }).then(() => {
      assert.equal(
        event.type, 'blur',
        'correct event was triggered'
      );
      assert.equal(
        event.target.getAttribute('id'), 'foo',
        'triggered on the correct element'
      );
    });
  }

  [`@test 'fillIn' takes context into consideration`](assert) {
    assert.expect(2);

    this.addTemplate('index', `
      <div id="parent">
        {{input type="text" id="first" class="current"}}
      </div>
      {{input type="text" id="second" class="current"}}
    `);

    this.runTask(() => {
      this.application.advanceReadiness();
    });

    let {application: {testHelpers: {visit, fillIn, andThen, find}}} = this;
    visit('/');
    fillIn('.current', '#parent', 'current value');

    return andThen(() => {
      assert.equal(find('#first').val(), 'current value');
      assert.equal(find('#second').val(), '');
    });
  }

  [`@test 'fillIn' focuses on the element`](assert) {
    assert.expect(2);

    this.add('route:application', Route.extend({
      actions: {
        wasFocused() {
          assert.ok(true, 'focusIn event was triggered');
        }
      }
    }));

    this.addTemplate('index', `
      <div id="parent">
        {{input type="text" id="first" focus-in="wasFocused"}}
      </div>'
    `);

    this.runTask(() => {
      this.application.advanceReadiness();
    });

    let {application: {testHelpers: {visit, fillIn, andThen, find, wait}}} = this;
    visit('/');
    fillIn('#first', 'current value');
    andThen(() => {
      assert.equal(
        find('#first').val(),'current value'
      );
    });

    return wait();
  }

  [`@test 'fillIn' fires 'input' and 'change' events in the proper order`](assert) {
    assert.expect(1);

    let events = [];
    this.add('controller:index', Controller.extend({
      actions: {
        oninputHandler(e) {
          events.push(e.type);
        },
        onchangeHandler(e) {
          events.push(e.type);
        }
      }
    }));

    this.addTemplate('index', `
      <input type="text" id="first"
          oninput={{action "oninputHandler"}}
          onchange={{action "onchangeHandler"}}>
    `);

    this.runTask(() => {
      this.application.advanceReadiness();
    });

    let {application: {testHelpers: {visit, fillIn, andThen, wait}}} = this;

    visit('/');
    fillIn('#first', 'current value');
    andThen(() => {
      assert.deepEqual(events, ['input', 'change'], '`input` and `change` events are fired in the proper order');
    });

    return wait();
  }

  [`@test 'fillIn' only sets the value in the first matched element`](assert) {
    this.addTemplate('index', `
      <input type="text" id="first" class="in-test">
      <input type="text" id="second" class="in-test">
    `);

    this.runTask(() => {
      this.application.advanceReadiness();
    });

    let {application: {testHelpers: {visit, fillIn, find, andThen, wait}}} = this;

    visit('/');
    fillIn('input.in-test', 'new value');
    andThen(() => {
      assert.equal(
        find('#first').val(), 'new value'
      );
      assert.equal(
        find('#second').val(), ''
      );
    });

    return wait();
  }

  [`@test 'triggerEvent' accepts an optional options hash and context`](assert) {
    assert.expect(3);

    let event;
    this.add('component:index-wrapper', Component.extend({
      didInsertElement() {
        this.$('.input').on('keydown change', e => event = e);
      }
    }));

    this.addTemplate('components/index-wrapper', `
      {{input type="text" id="outside-scope" class="input"}}
      <div id="limited">
        {{input type="text" id="inside-scope" class="input"}}
      </div>
    `);
    this.addTemplate('index', `{{index-wrapper}}`);

    this.runTask(() => {
      this.application.advanceReadiness();
    });

    let {application: {testHelpers: {wait, triggerEvent}}} = this;
    return wait().then(() => {
      return triggerEvent('.input', '#limited', 'keydown', { keyCode: 13 });
    }).then(() => {
      assert.equal(event.keyCode, 13, 'options were passed');
      assert.equal(event.type, 'keydown', 'correct event was triggered');
      assert.equal(event.target.getAttribute('id'), 'inside-scope', 'triggered on the correct element');
    });
  }

});

moduleFor('ember-testing: debugging helpers', class extends HelpersApplicationTestCase {

  constructor() {
    super();
    this.runTask(() => {
      this.application.advanceReadiness();
    });
  }

  [`@test pauseTest pauses`](assert) {
    assert.expect(1);

    let {application: {testHelpers: {andThen, pauseTest}}} = this;
    andThen(() => {
      Test.adapter.asyncStart = () => {
        assert.ok(
          true,
          'Async start should be called after waiting for other helpers'
        );
      };
    });

    pauseTest();
  }

  [`@test pauseTest stashes test timeout`](assert) {
    assert.expect(1);

    let {application: {testHelpers: {andThen, pauseTest, resumeTest}}} = this;
    let origTimeout = 20,
      testTimeout = origTimeout;

    Test.adapter.stashTimeout = () => {
      testTimeout = 0;
      return () => {
        testTimeout = origTimeout;
      }
    };

    run.later(() => {
      assert.equal(testTimeout, 0);
      resumeTest();
    }, 20);

    pauseTest();
  }

  [`@test resumeTest restores test timeout`](assert) {
    assert.expect(1);

    let {application: {testHelpers: {andThen, pauseTest, resumeTest}}} = this;
    let origTimeout = 20,
      testTimeout = origTimeout;

    Test.adapter.stashTimeout = () => {
      testTimeout = 0;
      return () => {
        testTimeout = origTimeout;
      };
    };

    run.later(() => {
      resumeTest();
      assert.equal(testTimeout, origTimeout);
    }, 20);

    pauseTest();
  }

  [`@test resumeTest resumes paused tests`](assert) {
    assert.expect(1);

    let {application: {testHelpers: {pauseTest, resumeTest}}} = this;

    run.later(() => resumeTest(), 20);
    return pauseTest().then(() => {
      assert.ok(true, 'pauseTest promise was resolved');
    });
  }

  [`@test resumeTest throws if nothing to resume`](assert) {
    assert.expect(1);

    assert.throws(() => {
      this.application.testHelpers.resumeTest();
    }, /Testing has not been paused. There is nothing to resume./);
  }

});

moduleFor('ember-testing: routing helpers', class extends HelpersTestCase {

  constructor() {
    super();
    this.runTask(() => {
      this.createApplication();
      this.application.setupForTesting();
      this.application.injectTestHelpers();
      this.router.map(function() {
        this.route('posts', {resetNamespace: true}, function() {
          this.route('new');
          this.route('edit', { resetNamespace: true });
        });
      });
    });
    this.runTask(() => {
      this.application.advanceReadiness();
    });
  }

  [`@test currentRouteName for '/'`](assert) {
    assert.expect(3);

    let {application: {testHelpers}} = this;
    return testHelpers.visit('/').then(() => {
      assert.equal(
        testHelpers.currentRouteName(), 'index',
        `should equal 'index'.`
      );
      assert.equal(
        testHelpers.currentPath(), 'index',
        `should equal 'index'.`
      );
      assert.equal(
        testHelpers.currentURL(), '/',
        `should equal '/'.`
      );
    });
  }

  [`@test currentRouteName for '/posts'`](assert) {
    assert.expect(3);

    let {application: {testHelpers}} = this;
    return testHelpers.visit('/posts').then(() => {
      assert.equal(
        testHelpers.currentRouteName(), 'posts.index',
        `should equal 'posts.index'.`
      );
      assert.equal(
        testHelpers.currentPath(), 'posts.index',
        `should equal 'posts.index'.`
      );
      assert.equal(
        testHelpers.currentURL(), '/posts',
        `should equal '/posts'.`
      );
    });
  }

  [`@test currentRouteName for '/posts/new'`](assert) {
    assert.expect(3);

    let {application: {testHelpers}} = this;
    return testHelpers.visit('/posts/new').then(() => {
      assert.equal(
        testHelpers.currentRouteName(), 'posts.new',
        `should equal 'posts.new'.`
      );
      assert.equal(
        testHelpers.currentPath(), 'posts.new',
        `should equal 'posts.new'.`
      );
      assert.equal(
        testHelpers.currentURL(), '/posts/new',
        `should equal '/posts/new'.`
      );
    });
  }

  [`@test currentRouteName for '/posts/edit'`](assert) {
    assert.expect(3);

    let {application: {testHelpers}} = this;
    return testHelpers.visit('/posts/edit').then(() => {
      assert.equal(
        testHelpers.currentRouteName(), 'edit',
        `should equal 'edit'.`
      );
      assert.equal(
        testHelpers.currentPath(), 'posts.edit',
        `should equal 'posts.edit'.`
      );
      assert.equal(
        testHelpers.currentURL(), '/posts/edit',
        `should equal '/posts/edit'.`
      );
    });
  }

});

moduleFor('ember-testing: pendingRequests', class extends HelpersApplicationTestCase {

  [`@test pendingRequests is maintained for ajaxSend and ajaxComplete events`](assert) {
    assert.equal(
      pendingRequests(), 0
    );

    let xhr = { some: 'xhr' };

    jQuery(document).trigger('ajaxSend', xhr);
    assert.equal(
      pendingRequests(), 1,
      'Ember.Test.pendingRequests was incremented'
    );

    jQuery(document).trigger('ajaxComplete', xhr);
    assert.equal(
      pendingRequests(), 0,
      'Ember.Test.pendingRequests was decremented'
    );
  }

  [`@test pendingRequests is ignores ajaxComplete events from past setupForTesting calls`](assert) {
    assert.equal(
      pendingRequests(), 0
    );

    let xhr = { some: 'xhr' };

    jQuery(document).trigger('ajaxSend', xhr);
    assert.equal(
      pendingRequests(), 1,
      'Ember.Test.pendingRequests was incremented'
    );

    setupForTesting();

    assert.equal(
      pendingRequests(), 0,
      'Ember.Test.pendingRequests was reset'
    );

    let altXhr = { some: 'more xhr' };

    jQuery(document).trigger('ajaxSend', altXhr);
    assert.equal(
      pendingRequests(), 1,
      'Ember.Test.pendingRequests was incremented'
    );

    jQuery(document).trigger('ajaxComplete', xhr);
    assert.equal(
      pendingRequests(), 1,
      'Ember.Test.pendingRequests is not impressed with your unexpected complete'
    );
  }

  [`@test pendingRequests is reset by setupForTesting`](assert) {
    incrementPendingRequests();

    setupForTesting();

    assert.equal(
      pendingRequests(), 0,
      'pendingRequests is reset'
    );
  }

});

moduleFor('ember-testing: async router', class extends HelpersTestCase {
  constructor() {
    super();

    this.runTask(() => {
      this.createApplication();

      this.router.map(function() {
        this.route('user', { resetNamespace: true }, function() {
          this.route('profile');
          this.route('edit');
        });
      });

      // Emulate a long-running unscheduled async operation.
      let resolveLater = () => new RSVP.Promise(resolve => {
        /*
         * The wait() helper has a 10ms tick. We should resolve() after
         * at least one tick to test whether wait() held off while the
         * async router was still loading. 20ms should be enough.
         */
        run.later(resolve, {firstName: 'Tom'}, 20);
      });

      this.add('route:user', Route.extend({
        model() {
          return resolveLater();
        }
      }));

      this.add('route:user.profile', Route.extend({
        beforeModel() {
          return resolveLater().then(() => this.transitionTo('user.edit'));
        }
      }));

      this.application.setupForTesting();
    });

    this.application.injectTestHelpers();
    this.runTask(() => {
      this.application.advanceReadiness();
    });
  }

  [`@test currentRouteName for '/user'`](assert) {
    assert.expect(4);

    let {application: {testHelpers}} = this;
    return testHelpers.visit('/user').then(() => {
      assert.equal(
        testHelpers.currentRouteName(), 'user.index',
        `should equal 'user.index'.`
      );
      assert.equal(
        testHelpers.currentPath(), 'user.index',
        `should equal 'user.index'.`
      );
      assert.equal(
        testHelpers.currentURL(), '/user',
        `should equal '/user'.`
      );
      let userRoute = this.applicationInstance.lookup('route:user');
      assert.equal(
        userRoute.get('controller.model.firstName'), 'Tom',
        `should equal 'Tom'.`
      );
    });
  }

  [`@test currentRouteName for '/user/profile'`](assert) {
    assert.expect(4);

    let {application: {testHelpers}} = this;
    return testHelpers.visit('/user/profile').then(() => {
      assert.equal(
        testHelpers.currentRouteName(), 'user.edit',
        `should equal 'user.edit'.`
      );
      assert.equal(
        testHelpers.currentPath(), 'user.edit',
        `should equal 'user.edit'.`
      );
      assert.equal(
        testHelpers.currentURL(), '/user/edit',
        `should equal '/user/edit'.`
      );
      let userRoute = this.applicationInstance.lookup('route:user');
      assert.equal(
        userRoute.get('controller.model.firstName'), 'Tom',
        `should equal 'Tom'.`
      );
    });
  }

});

moduleFor('ember-testing: can override built-in helpers', class extends HelpersTestCase {

  constructor() {
    super();
    this.runTask(() => {
      this.createApplication();
      this.application.setupForTesting();
    });
    this._originalVisitHelper = Test._helpers.visit;
    this._originalFindHelper  = Test._helpers.find;
  }

  teardown() {
    Test._helpers.visit = this._originalVisitHelper;
    Test._helpers.find  = this._originalFindHelper;
    super.teardown();
  }

  [`@test can override visit helper`](assert) {
    assert.expect(1);

    Test.registerHelper('visit', () => {
      assert.ok(true, 'custom visit helper was called');
    });

    this.application.injectTestHelpers();

    return this.application.testHelpers.visit();
  }

  [`@test can override find helper`](assert) {
    assert.expect(1);

    Test.registerHelper('find', () => {
      assert.ok(true, 'custom find helper was called');

      return ['not empty array'];
    });

    this.application.injectTestHelpers();

    return this.application.testHelpers.findWithAssert('.who-cares');
  }

});
