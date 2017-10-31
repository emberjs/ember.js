import { RenderingTest, moduleFor } from '../../utils/test-case';
import { set } from 'ember-metal';
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

    this.runTask(() => set(this.context, 'items',
      emberA([{ id: 1 }, { id: 2 }, { id: 3 }])
    ));

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

    this.assertText('apple: apple |:  |orange: orange |banana: banana |');

    this.runTask(() => this.context.items.pushObject('strawberry'));

    this.assertText('apple: apple |:  |orange: orange |banana: banana |strawberry: strawberry |');

    this.runTask(() => set(this.context, 'items',
      emberA(['apple', null, 'orange', 'banana'])
    ));

    this.assertText('apple: apple |:  |orange: orange |banana: banana |');
  }

  ['@test nested partials using data from {{#each}}']() {
    this.registerPartial('_outer-partial', strip`
      [outer: {{name}}] {{partial 'inner-partial'}}
    `);

    this.registerPartial('inner-partial', '[inner: {{name}}]');

    this.render(strip`
      {{#each names as |name i|}}
        {{i}}: {{partial 'outer-partial'}}
      {{/each}}`, {
        names: emberA(['Alex', 'Ben'])
      });

    this.assertStableRerender();

    this.assertText('0: [outer: Alex] [inner: Alex]1: [outer: Ben] [inner: Ben]');

    this.runTask(() => this.context.names.pushObject('Sophie'));

    this.assertText('0: [outer: Alex] [inner: Alex]1: [outer: Ben] [inner: Ben]2: [outer: Sophie] [inner: Sophie]');

    this.runTask(() => set(this.context, 'names', emberA(['Alex', 'Ben'])));

    this.assertText('0: [outer: Alex] [inner: Alex]1: [outer: Ben] [inner: Ben]');
  }

  ['@test nested partials within nested `{{#with}}` blocks']() {
    this.registerPartial('_person2-partial', strip`
      {{#with 'Ben' as |person2|}}
        Hi {{person1}} (aged {{age}}) and {{person2}}. {{partial 'person3-partial'}}
      {{/with}}
    `);

    this.registerPartial('_person3-partial', strip`
      {{#with 'Alex' as |person3|}}
        Hi {{person1}} (aged {{age}}), {{person2}} and {{person3}}. {{partial 'person4-partial'}}
      {{/with}}
    `);

    this.registerPartial('_person4-partial', strip`
      {{#with 'Sarah' as |person4|}}
        Hi {{person1}} (aged {{age}}), {{person2}}, {{person3}} and {{person4}}.
      {{/with}}
    `);

    this.render(strip`
      {{#with 'Sophie' as |person1|}}
        Hi {{person1}} (aged {{age}}). {{partial 'person2-partial'}}
      {{/with}}`,
      { age: 0 }
    );

    this.assertStableRerender();

    this.assertText('Hi Sophie (aged 0). Hi Sophie (aged 0) and Ben. Hi Sophie (aged 0), Ben and Alex. Hi Sophie (aged 0), Ben, Alex and Sarah.');

    this.runTask(() => set(this.context, 'age', 1));

    this.assertText('Hi Sophie (aged 1). Hi Sophie (aged 1) and Ben. Hi Sophie (aged 1), Ben and Alex. Hi Sophie (aged 1), Ben, Alex and Sarah.');

    this.runTask(() => set(this.context, 'age', 0));

    this.assertText('Hi Sophie (aged 0). Hi Sophie (aged 0) and Ben. Hi Sophie (aged 0), Ben and Alex. Hi Sophie (aged 0), Ben, Alex and Sarah.');
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
