import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled } from '@ember/test-helpers';
import { hash } from '@ember/helper';
import { computed } from '@ember/object';

class Model {
  @tracked firstName;
  @tracked lastName;

  constructor({ firstName, lastName }) {
    this.firstName = firstName;
    this.lastName = lastName;
  }
}

class State {
  @tracked model;

  constructor(model) {
    this.model = new Model(model);
  }
}

module('Helpers test: {{hash}}', function (hooks) {
  setupRenderingTest(hooks);

  test('returns a hash with the right key-value', async function (assert) {
    await render(
      <template>{{#let (hash name='Sergio') as |person|}}{{person.name}}{{/let}}</template>
    );

    await assert.stableRender('Sergio');
  });

  test('can be shadowed', async function (assert) {
    let hash = (obj) =>
      Object.entries(obj)
        .map(([key, value]) => `hash:${key}=${value}`)
        .join(',');
    let shadowHash = hash;

    await render(
      <template>
        ({{hash apple='red' banana='yellow'}})
        {{#let shadowHash as |hash|}}
          ({{hash apple='green'}})
        {{/let}}
      </template>
    );

    assert.dom().hasText('(hash:apple=red,hash:banana=yellow) (hash:apple=green)');
    await assert.stableRender();
  });

  test('can have more than one key-value', async function (assert) {
    await render(
      <template>
        {{#let (hash name='Sergio' lastName='Arbeo') as |person|}}
          {{person.name}}
          {{person.lastName}}
        {{/let}}
      </template>
    );

    assert.dom().hasText('Sergio Arbeo');
    await assert.stableRender();
  });

  test('binds values when variables are used', async function (assert) {
    let state = new State({ firstName: 'Marisa' });

    await render(
      <template>
        {{#let (hash name=state.model.firstName lastName='Arbeo') as |person|}}
          {{person.name}}
          {{person.lastName}}
        {{/let}}
      </template>
    );

    assert.dom().hasText('Marisa Arbeo');
    await assert.stableRender();

    state.model.firstName = 'Sergio';
    await settled();

    assert.dom().hasText('Sergio Arbeo');

    state.model = new Model({ firstName: 'Marisa' });
    await settled();

    assert.dom().hasText('Marisa Arbeo');
  });

  test('binds multiple values when variables are used', async function (assert) {
    let state = new State({ firstName: 'Marisa', lastName: 'Arbeo' });

    await render(
      <template>
        {{#let (hash name=state.model.firstName lastName=state.model.lastName) as |person|}}
          {{person.name}}
          {{person.lastName}}
        {{/let}}
      </template>
    );

    assert.dom().hasText('Marisa Arbeo');
    await assert.stableRender();

    state.model.firstName = 'Sergio';
    await settled();

    assert.dom().hasText('Sergio Arbeo');

    state.model.lastName = 'Smith';
    await settled();

    assert.dom().hasText('Sergio Smith');

    state.model = new Model({ firstName: 'Marisa', lastName: 'Arbeo' });
    await settled();

    assert.dom().hasText('Marisa Arbeo');
  });

  test('hash helpers can be nested', async function (assert) {
    let state = new State({ firstName: 'Balint' });

    await render(
      <template>
        {{#let (hash person=(hash name=state.model.firstName)) as |ctx|}}{{ctx.person.name}}{{/let}}
      </template>
    );

    await assert.stableRender('Balint');

    state.model.firstName = 'Chad';
    await settled();

    assert.dom().hasText('Chad');

    state.model = new Model({ firstName: 'Balint' });
    await settled();

    assert.dom().hasText('Balint');
  });

  test('should yield hash of internal properties', async function (assert) {
    let fooBarInstance;

    class FooBar extends Component {
      @tracked model = new Model({ firstName: 'Chad' });

      constructor(owner, args) {
        super(owner, args);
        fooBarInstance = this;
      }

      <template>{{yield (hash firstName=this.model.firstName)}}</template>
    }

    await render(
      <template>
        <FooBar as |values|>{{values.firstName}}</FooBar>
      </template>
    );

    await assert.stableRender('Chad');

    fooBarInstance.model.firstName = 'Godfrey';
    await settled();

    assert.dom().hasText('Godfrey');

    fooBarInstance.model = new Model({ firstName: 'Chad' });
    await settled();

    assert.dom().hasText('Chad');
  });

  test('should yield hash of internal and external properties', async function (assert) {
    let state = new State({ lastName: 'Hietala' });
    let fooBarInstance;

    class FooBar extends Component {
      @tracked model = new Model({ firstName: 'Chad' });

      constructor(owner, args) {
        super(owner, args);
        fooBarInstance = this;
      }

      <template>{{yield (hash firstName=this.model.firstName lastName=@lastName)}}</template>
    }

    await render(
      <template>
        <FooBar @lastName={{state.model.lastName}} as |values|>
          {{values.firstName}}
          {{values.lastName}}
        </FooBar>
      </template>
    );

    assert.dom().hasText('Chad Hietala');
    await assert.stableRender();

    fooBarInstance.model.firstName = 'Godfrey';
    state.model.lastName = 'Chan';
    await settled();

    assert.dom().hasText('Godfrey Chan');

    fooBarInstance.model = new Model({ firstName: 'Chad' });
    state.model = new Model({ lastName: 'Hietala' });
    await settled();

    assert.dom().hasText('Chad Hietala');
  });

  test('works with computeds', async function (assert) {
    let state = new Model({ firstName: 'Chad', lastName: 'Hietala' });

    class FooBar extends Component {
      @computed('args.hash.firstName', 'args.hash.lastName')
      get fullName() {
        return `${this.args.hash.firstName} ${this.args.hash.lastName}`;
      }

      <template>{{this.fullName}}</template>
    }

    await render(
      <template>
        <FooBar @hash={{hash firstName=state.firstName lastName=state.lastName}} />
      </template>
    );

    await assert.stableRender('Chad Hietala');

    state.firstName = 'Godfrey';
    state.lastName = 'Chan';
    await settled();

    assert.dom().hasText('Godfrey Chan');
  });
});
