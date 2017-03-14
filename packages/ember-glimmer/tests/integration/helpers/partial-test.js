import { RenderingTest, moduleFor } from '../../utils/test-case';
import { set } from 'ember-metal';
import { strip } from '../../utils/abstract-test-case';


moduleFor('Helpers test: {{partial}}', class extends RenderingTest {

  ['@test should render other templates registered with the container']() {
    this.registerPartial('_subTemplateFromContainer', 'sub-template');

    expectDeprecation(() => {
      this.render(`This {{partial "subTemplateFromContainer"}} is pretty great.`);
    }, /Partials are now deprecated in favor of using components. Please change "subTemplateFromContainer" to a component\./);

    this.assertStableRerender();

    this.assertText('This sub-template is pretty great.');
  }

  ['@test should render other slash-separated templates registered with the container']() {
    this.registerPartial('child/_subTemplateFromContainer', 'sub-template');

    expectDeprecation(() => {
      this.render(`This {{partial "child/subTemplateFromContainer"}} is pretty great.`);
    }, /Partials are now deprecated in favor of using components. Please change "child\/subTemplateFromContainer" to a component\./);

    this.assertStableRerender();

    this.assertText('This sub-template is pretty great.');
  }

  ['@test should use the current context']() {
    this.registerPartial('_person_name', '{{model.firstName}} {{model.lastName}}');

    expectDeprecation(() => {
      this.render('Who is {{partial "person_name"}}?', {
        model: {
          firstName: 'Kris',
          lastName: 'Selden'
        }
      });
    }, /Partials are now deprecated in favor of using components. Please change "person_name" to a component\./);

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

    expectDeprecation(() => {
      this.render('This {{partial templates.partialName}} is pretty {{partial nonexistent}}great.', {
        templates: { partialName: 'subTemplate' }
      });
    }, /Partials are now deprecated in favor of using components. Please change "subTemplate" to a component\./);

    this.assertStableRerender();

    this.assertText('This sub-template is pretty great.');

    expectDeprecation(() => {
      this.runTask(() => set(this.context, 'templates.partialName', 'otherTemplate'));
    }, /Partials are now deprecated in favor of using components. Please change "otherTemplate" to a component\./);

    this.assertText('This other-template is pretty great.');

    this.runTask(() => set(this.context, 'templates.partialName', null));

    this.assertText('This  is pretty great.');

    expectDeprecation(() => {
      this.runTask(() => set(this.context, 'templates', { partialName: 'subTemplate' }));
    }, /Partials are now deprecated in favor of using components. Please change "subTemplate" to a component\./);

    this.assertText('This sub-template is pretty great.');
  }

  ['@test dynamic partials in {{#each}}']() {
    expectDeprecation(/^Partials are now deprecated in favor of using components\./);

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
    expectDeprecation(/^Partials are now deprecated in favor of using components\./);

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
});
