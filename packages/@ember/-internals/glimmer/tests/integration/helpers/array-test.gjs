import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled } from '@ember/test-helpers';
import { array, hash } from '@ember/helper';

class People {
  @tracked personOne;
  @tracked personTwo;

  constructor({ personOne, personTwo }) {
    this.personOne = personOne;
    this.personTwo = personTwo;
  }
}

class State {
  @tracked model;

  constructor(model) {
    this.model = new People(model);
  }
}

module('Helpers test: {{array}}', function (hooks) {
  setupRenderingTest(hooks);

  test('returns an array', async function (assert) {
    await render(
      <template>
        {{#let (array 'Sergio') as |people|}}
          {{#each people as |personName|}}
            {{personName}}
          {{/each}}
        {{/let}}
      </template>
    );

    assert.dom().hasText('Sergio');
    await assert.stableRender();
  });

  test('the array helper can be shadowed', async function (assert) {
    function array(...list) {
      return list.map((n) => n * 2);
    }

    let shadowArray = array;
    let First = <template>{{#each (array 1 2 3) as |n|}}[{{n}}]{{/each}}</template>;

    await render(
      <template>
        {{#let shadowArray as |array|}}
          {{#each (array 5 10 15) as |n|}}[{{n}}]{{/each}}
        {{/let}}
        <First />
      </template>
    );

    assert.dom().hasText('[10][20][30] [2][4][6]');
    await assert.stableRender();
  });

  test('can have more than one value', async function (assert) {
    await render(
      <template>
        {{#let (array 'Sergio' 'Robert') as |people|}}
          {{#each people as |personName|}}
            {{personName}},
          {{/each}}
        {{/let}}
      </template>
    );

    assert.dom().hasText('Sergio, Robert,');
    await assert.stableRender();
  });

  test('binds values when variables are used', async function (assert) {
    let state = new People({ personOne: 'Tom' });

    await render(
      <template>
        {{#let (array state.personOne) as |people|}}
          {{#each people as |personName|}}
            {{personName}}
          {{/each}}
        {{/let}}
      </template>
    );

    assert.dom().hasText('Tom');
    await assert.stableRender();

    state.personOne = 'Yehuda';
    await settled();

    assert.dom().hasText('Yehuda');

    state.personOne = 'Tom';
    await settled();

    assert.dom().hasText('Tom');
  });

  test('binds multiple values when variables are used', async function (assert) {
    let state = new People({ personOne: 'Tom', personTwo: 'Yehuda' });

    await render(
      <template>
        {{#let (array state.personOne state.personTwo) as |people|}}
          {{#each people as |personName|}}
            {{personName}},
          {{/each}}
        {{/let}}
      </template>
    );

    assert.dom().hasText('Tom, Yehuda,');
    await assert.stableRender();

    state.personOne = 'Sergio';
    await settled();

    assert.dom().hasText('Sergio, Yehuda,');

    state.personTwo = 'Tom';
    await settled();

    assert.dom().hasText('Sergio, Tom,');

    state.personOne = 'Tom';
    state.personTwo = 'Yehuda';
    await settled();

    assert.dom().hasText('Tom, Yehuda,');
  });

  test('array helpers can be nested', async function (assert) {
    let state = new People({ personOne: 'Tom', personTwo: 'Yehuda' });

    await render(
      <template>
        {{#let (array (array state.personOne state.personTwo)) as |listOfPeople|}}
          {{#each listOfPeople as |people|}}
            List:
            {{#each people as |personName|}}
              {{personName}},
            {{/each}}
          {{/each}}
        {{/let}}
      </template>
    );

    assert.dom().hasText('List: Tom, Yehuda,');
    await assert.stableRender();

    state.personOne = 'Chad';
    await settled();

    assert.dom().hasText('List: Chad, Yehuda,');

    state.personTwo = 'Balint';
    await settled();

    assert.dom().hasText('List: Chad, Balint,');

    state.personOne = 'Tom';
    state.personTwo = 'Yehuda';
    await settled();

    assert.dom().hasText('List: Tom, Yehuda,');
  });

  test('should yield hash of an array of internal properties', async function (assert) {
    let fooBarInstance;

    class FooBar extends Component {
      @tracked model = new People({ personOne: 'Chad' });

      constructor(owner, args) {
        super(owner, args);
        fooBarInstance = this;
      }

      <template>{{yield (hash people=(array this.model.personOne))}}</template>
    }

    await render(
      <template>
        <FooBar as |values|>{{#each values.people as |personName|}}{{personName}}{{/each}}</FooBar>
      </template>
    );

    await assert.stableRender('Chad');

    fooBarInstance.model.personOne = 'Godfrey';
    await settled();

    assert.dom().hasText('Godfrey');

    fooBarInstance.model = new People({ personOne: 'Chad' });
    await settled();

    assert.dom().hasText('Chad');

    fooBarInstance.model.personOne = 'Godfrey';
    await settled();

    assert.dom().hasText('Godfrey');
  });

  test('should yield hash of an array of internal and external properties', async function (assert) {
    let state = new State({ personTwo: 'Tom' });
    let fooBarInstance;

    class FooBar extends Component {
      @tracked model = new People({ personOne: 'Chad' });

      constructor(owner, args) {
        super(owner, args);
        fooBarInstance = this;
      }

      <template>{{yield (hash people=(array this.model.personOne @personTwo))}}</template>
    }

    await render(
      <template>
        <FooBar @personTwo={{state.model.personTwo}} as |values|>
          {{#each values.people as |personName|}}
            {{personName}},
          {{/each}}
        </FooBar>
      </template>
    );

    assert.dom().hasText('Chad, Tom,');
    await assert.stableRender();

    fooBarInstance.model.personOne = 'Godfrey';
    state.model.personTwo = 'Yehuda';
    await settled();

    assert.dom().hasText('Godfrey, Yehuda,');

    fooBarInstance.model = new People({ personOne: 'Chad' });
    state.model = new People({ personTwo: 'Tom' });
    await settled();

    assert.dom().hasText('Chad, Tom,');
  });

  test('should render when passing as argument to a component invocation', async function (assert) {
    let state = new People({ personTwo: 'Chad' });
    let FooBar = <template>{{#each @people as |personName|}}{{personName}},{{/each}}</template>;

    await render(<template><FooBar @people={{array 'Tom' state.personTwo}} /></template>);

    await assert.stableRender('Tom,Chad,');

    state.personTwo = 'Godfrey';
    await settled();

    assert.dom().hasText('Tom,Godfrey,');

    state.personTwo = 'Chad';
    await settled();

    assert.dom().hasText('Tom,Chad,');
  });

  test('should return an entirely new array when any argument change', async function (assert) {
    let state = new People({ personTwo: 'Chad' });
    let fooBarInstance;

    class FooBar extends Component {
      constructor(owner, args) {
        super(owner, args);
        fooBarInstance = this;
      }

      <template>{{#each @people as |personName|}}{{personName}},{{/each}}</template>
    }

    await render(<template><FooBar @people={{array 'Tom' state.personTwo}} /></template>);

    let firstArray = fooBarInstance.args.people;

    state.personTwo = 'Godfrey';
    await settled();

    assert.ok(
      firstArray !== fooBarInstance.args.people,
      'should have created an entirely new array'
    );
  });

  test('capture array values in JS to assert deep equal', async function (assert) {
    let state = new People({ personTwo: 'Godfrey' });
    let captured;

    function capture(list) {
      captured = list;
      return 'captured';
    }

    await render(<template>{{capture (array 'Tom' state.personTwo)}}</template>);

    assert.deepEqual(captured, ['Tom', 'Godfrey']);

    state.personTwo = 'Robert';
    await settled();

    assert.deepEqual(captured, ['Tom', 'Robert']);

    state.personTwo = 'Godfrey';
    await settled();

    assert.deepEqual(captured, ['Tom', 'Godfrey']);
  });

  test('GH18693 properties in hash can be accessed from the array', async function (assert) {
    await render(
      <template>{{#each (array (hash some='thing')) as |item|}}{{item.some}}{{/each}}</template>
    );

    assert.dom().hasText('thing');
  });
});
