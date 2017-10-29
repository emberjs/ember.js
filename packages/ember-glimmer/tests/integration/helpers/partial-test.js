import { RenderingTest, moduleFor } from '../../utils/test-case';
import { set } from 'ember-metal';
import { A as emberA } from 'ember-runtime';
import { strip } from '../../utils/abstract-test-case';


moduleFor('Helpers test: {{partial}}', class extends RenderingTest {

  ['@test should render other templates registered with the container']() {
    this.registerPartial('_subTemplateFromContainer', 'sub-template');

    this.render(`This {{partial "subTemplateFromContainer"}} is pretty great.`);

    this.assertStableRerender();

    this.assertText('This sub-template is pretty great.');
  }

  ['@test should render other slash-separated templates registered with the container']() {
    this.registerPartial('child/_subTemplateFromContainer', 'sub-template');

    this.render(`This {{partial "child/subTemplateFromContainer"}} is pretty great.`);

    this.assertStableRerender();

    this.assertText('This sub-template is pretty great.');
  }

  ['@test should use the current context']() {
    this.registerPartial('_person_name', '{{model.firstName}} {{model.lastName}}');

    this.render('Who is {{partial "person_name"}}?', {
      model: {
        firstName: 'Kris',
        lastName: 'Selden'
      }
    });

    this.assertStableRerender();

    this.assertText('Who is Kris Selden?');

    this.runTask(() => set(this.context, 'model.firstName', 'Kelly'));

    this.assertText('Who is Kelly Selden?');

    this.runTask(() => set(this.context, 'model', { firstName: 'Kris', lastName: 'Selden' }));

    this.assertText('Who is Kris Selden?');
  }

  ['@test Quoteless parameters passed to {{partial}} perform a bound property lookup of the partial name']() {
    this.registerPartial('_subTemplate', 'sub-template');
    this.registerPartial('_otherTemplate', 'other-template');

    this.render('This {{partial templates.partialName}} is pretty {{partial nonexistent}}great.', {
      templates: { partialName: 'subTemplate' }
    });

    this.assertStableRerender();

    this.assertText('This sub-template is pretty great.');

    this.runTask(() => set(this.context, 'templates.partialName', 'otherTemplate'));

    this.assertText('This other-template is pretty great.');

    this.runTask(() => set(this.context, 'templates.partialName', null));

    this.assertText('This  is pretty great.');

    this.runTask(() => set(this.context, 'templates', { partialName: 'subTemplate' }));

    this.assertText('This sub-template is pretty great.');
  }

  ['@test partial using data from {{#each}}']() {
    this.registerPartial('show-item', '{{item}}');

    this.render(strip`
      {{#each model.items as |item|}}
        {{item}}: {{partial 'show-item'}} |
      {{/each}}`, {
        model: {
          items: emberA(['apple', 'orange', 'banana']),
        }
      });

    this.assertStableRerender();

    this.assertText('apple: apple |orange: orange |banana: banana |');

    this.runTask(() => this.context.model.items.pushObject('strawberry'));

    this.assertText('apple: apple |orange: orange |banana: banana |strawberry: strawberry |');

    this.runTask(() => set(this.context, 'model', {
      items: emberA(['apple', 'orange', 'banana']),
    }));

    this.assertText('apple: apple |orange: orange |banana: banana |');
  }

  ['@test partial using `{{get` on data from {{#with}}']() {
    this.registerPartial('show-id', '{{get item "id"}}');

    this.render(strip`
      {{#with model as |item|}}
        {{item.name}}: {{partial 'show-id'}}
      {{/with}}`, {
        model: { id: 1, name: 'foo' }
      });

    this.assertStableRerender();

    this.assertText('foo: 1');

    this.runTask(() => set(this.context, 'model.id', 2));

    this.assertText('foo: 2');

    this.runTask(() => set(this.context, 'model.name', 'bar'));

    this.assertText('bar: 2');

    this.runTask(() => set(this.context, 'model', { id: 1, name: 'foo' }));

    this.assertText('foo: 1');
  }

  ['@test partial using `{{get` on data from {{#each}}']() {
    this.registerPartial('show-item', '{{get item "id"}}');

    this.render(strip`
      {{#each items as |item|}}
        {{item.id}}: {{partial 'show-item'}} |
      {{/each}}`, {
        items: emberA([{ id: 1 }, { id: 2 }, { id: 3 }]),
      });

    this.assertStableRerender();

    this.assertText('1: 1 |2: 2 |3: 3 |');

    this.runTask(() => this.context.items.pushObject({ id: 4 }));

    this.assertText('1: 1 |2: 2 |3: 3 |4: 4 |');

    this.runTask(() => set(this.context, 'items', {
        items: emberA([{ id: 1 }, { id: 2 }, { id: 3 }]),
    }));

    this.assertText('1: 1 |2: 2 |3: 3 |');
  }

  ['@test partial using conditional on data from {{#each}}']() {
    this.registerPartial('show-item', '{{#if item}}{{item}}{{/if}}');

    this.render(strip`
      {{#each items as |item|}}
        {{item}}: {{partial 'show-item'}} |
      {{/each}}`, {
        items: emberA(['apple', null, 'orange', 'banana']),
      });

    this.assertStableRerender();

    this.assertText('apple: apple |orange: orange |banana: banana |');

    this.runTask(() => this.context.items.pushObject('strawberry'));

    this.assertText('apple: apple |orange: orange |banana: banana |strawberry: strawberry |');

    this.runTask(() => set(this.context, 'items', {
      items: emberA(['apple', 'orange', 'banana']),
    }));

    this.assertText('apple: apple |orange: orange |banana: banana |');
  }

  ['@test dynamic partials in {{#each}}']() {
    this.registerPartial('_odd', 'ODD{{i}}');
    this.registerPartial('_even', 'EVEN{{i}}');

    this.render(strip`
      {{#each model.items as |template i|}}
        {{model.type}}: {{partial template}}
      {{/each}}`, {
        model: {
          items: ['even', 'odd', 'even', 'odd'],
          type: 'number'
        }
      });

    this.assertStableRerender();

    this.assertText('number: EVEN0number: ODD1number: EVEN2number: ODD3');

    this.runTask(() => set(this.context, 'model.type', 'integer'));

    this.assertText('integer: EVEN0integer: ODD1integer: EVEN2integer: ODD3');

    this.runTask(() => set(this.context, 'model', {
      items: ['even', 'odd', 'even', 'odd'],
      type: 'number'
    }));

    this.assertText('number: EVEN0number: ODD1number: EVEN2number: ODD3');
  }

  ['@test dynamic partials in {{#with}}']() {
    this.registerPartial('_thing', '{{t}}');

    this.render(strip`
      {{#with item.thing as |t|}}
        {{partial t}}
      {{else}}
        Nothing!
      {{/with}}`, {
        item: { thing: false }
      });

    this.assertStableRerender();

    this.assertText('Nothing!');

    this.runTask(() => set(this.context, 'item.thing', 'thing'));

    this.assertText('thing');

    this.runTask(() => set(this.context, 'item', { thing: false }));

    this.assertText('Nothing!');
  }

  ['@test partials which contain contextual components']() {
    this.registerComponent('outer-component', {
      template: '{{yield (hash inner=(component "inner-component" name=name))}}'
    });

    this.registerComponent('inner-component', {
      template: '{{yield (hash name=name)}}'
    });

    this.registerPartial('_some-partial', strip`
      {{#outer.inner as |inner|}}
        inner.name: {{inner.name}}
      {{/outer.inner}}
    `);

    this.render(strip`
      {{#outer-component name=name as |outer|}}
        {{partial 'some-partial'}}
      {{/outer-component}}`, { name: 'Sophie' });

    this.assertStableRerender();

    this.assertText('inner.name: Sophie');

    this.runTask(() => set(this.context, 'name', 'Ben'));

    this.assertText('inner.name: Ben');

    this.runTask(() => set(this.context, 'name', 'Sophie'));

    this.assertText('inner.name: Sophie');
  }
});
