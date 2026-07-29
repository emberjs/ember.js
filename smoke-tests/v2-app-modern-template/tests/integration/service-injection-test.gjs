import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, click } from '@ember/test-helpers';
import { on } from '@ember/modifier';
import Component from '@glimmer/component';
import Service from '@ember/service';
import { service } from '@ember/service';

class CounterDisplay extends Component {
  @service counter;

  increment = () => this.counter.increment();

  <template>
    <button type="button" {{on "click" this.increment}}>increment</button>
    <span data-test-count>{{this.counter.count}}</span>
  </template>
}

module('Integration | service injection', function (hooks) {
  setupRenderingTest(hooks);

  test('@service injects a working, reactive service', async function (assert) {
    await render(<template><CounterDisplay /></template>);

    assert.dom('[data-test-count]').hasText('0');

    await click('button');
    await click('button');

    assert.dom('[data-test-count]').hasText('2');
    assert.strictEqual(
      this.owner.lookup('service:counter').count,
      2,
      'same singleton'
    );
  });

  test('@service with an explicit name resolves that service', async function (assert) {
    class NamedInjection extends Component {
      @service('counter') tally;

      <template>
        <span data-test-tally>{{this.tally.count}}</span>
      </template>
    }

    this.owner.lookup('service:counter').increment();

    await render(<template><NamedInjection /></template>);

    assert.dom('[data-test-tally]').hasText('1');
  });

  test('an injected service can be overridden by assignment', async function (assert) {
    class Stub extends Service {
      count = 99;
    }

    let component = null;

    class Exposes extends Component {
      @service counter;

      constructor(owner, args) {
        super(owner, args);
        component = this;
      }

      <template>
        <span data-test-count>{{this.counter.count}}</span>
      </template>
    }

    await render(<template><Exposes /></template>);

    component.counter = Stub.create();
    assert.strictEqual(component.counter.count, 99, 'override is readable');
  });
});
